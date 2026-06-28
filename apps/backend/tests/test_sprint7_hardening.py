import pytest
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, AsyncMock, patch
from fastapi import HTTPException
from app.core.errors import RateLimitExceededError

from app.api.v1.deps import check_rate_limit
from app.worker.tasks import cleanup_project_storage, cleanup_old_exports, recover_failed_jobs
from app.db.models.job import Job
from app.db.models.video import Video
from app.db.models.export import Export as ExportRow
from app.db.models.project import Project as ProjectModel


class FakeRedis:
    def __init__(self):
        self.store = {}
        
    def incr(self, key):
        self.store[key] = self.store.get(key, 0) + 1
        return self.store[key]
        
    def expire(self, key, seconds):
        pass


@pytest.mark.asyncio
async def test_rate_limiter_allows_under_limit_and_blocks_above():
    profile = MagicMock()
    profile.id = uuid.uuid4()
    
    settings = MagicMock()
    fake_redis = FakeRedis()
    
    with patch("app.api.v1.deps.get_redis_client", return_value=fake_redis):
        # 60 requests should pass
        for _ in range(60):
            await check_rate_limit(profile=profile, settings=settings)
            
        # 61st request should raise 429
        with pytest.raises(RateLimitExceededError) as exc_info:
            await check_rate_limit(profile=profile, settings=settings)
        assert exc_info.value.status_code == 429
        assert "Rate limit exceeded" in exc_info.value.message


def test_cleanup_project_storage_purges_videos_and_exports():
    project_id = str(uuid.uuid4())
    proj_uuid = uuid.UUID(project_id)
    
    mock_video = MagicMock(spec=Video)
    mock_video.storage_path = "videos/file1.mp4"
    
    mock_export = MagicMock(spec=ExportRow)
    mock_export.storage_path = "exports/file2.mp4"
    
    mock_storage = MagicMock()
    mock_storage.delete = AsyncMock()
    
    mock_session = MagicMock()
    # Mocking executing Video query and then ExportRow query
    mock_result_videos = MagicMock()
    mock_result_videos.scalars().all.return_value = [mock_video]
    
    mock_result_exports = MagicMock()
    mock_result_exports.scalars().all.return_value = [mock_export]
    
    mock_session.execute.side_effect = [mock_result_videos, mock_result_exports]
    
    with patch("app.worker.tasks.get_storage_client", return_value=mock_storage), \
         patch("app.worker.tasks.worker_session") as mock_ws_ctx:
        
        mock_ws_ctx.return_value.__enter__.return_value = mock_session
        
        res = cleanup_project_storage(project_id)
        assert res == "cleanup_completed"
        
        # Verify storage deletions were triggered
        assert mock_storage.delete.call_count == 2
        mock_storage.delete.assert_any_call("videos/file1.mp4")
        mock_storage.delete.assert_any_call("exports/file2.mp4")


def test_cleanup_old_exports_expires_completed_records():
    mock_export = MagicMock(spec=ExportRow)
    mock_export.storage_path = "exports/old.mp4"
    mock_export.status = "completed"
    
    mock_storage = MagicMock()
    mock_storage.delete = AsyncMock()
    
    mock_session = MagicMock()
    mock_result = MagicMock()
    mock_result.scalars().all.return_value = [mock_export]
    mock_session.execute.return_value = mock_result
    
    with patch("app.worker.tasks.get_storage_client", return_value=mock_storage), \
         patch("app.worker.tasks.worker_session") as mock_ws_ctx:
        
        mock_ws_ctx.return_value.__enter__.return_value = mock_session
        
        res = cleanup_old_exports()
        assert res == "old_exports_cleaned"
        
        # Should have deleted from storage
        mock_storage.delete.assert_called_once_with("exports/old.mp4")
        assert mock_export.status == "expired"
        assert mock_export.storage_path is None
        mock_session.commit.assert_called_once()


def test_recover_failed_jobs_marks_stuck_jobs():
    mock_job = MagicMock(spec=Job)
    mock_job.project_id = uuid.uuid4()
    mock_job.status = "processing"
    
    mock_project = MagicMock(spec=ProjectModel)
    mock_project.status = "PROCESSING"
    
    mock_session = MagicMock()
    mock_result_jobs = MagicMock()
    mock_result_jobs.scalars().all.return_value = [mock_job]
    
    mock_result_proj = MagicMock()
    mock_result_proj.scalar_one_or_none.return_value = mock_project
    
    mock_session.execute.side_effect = [mock_result_jobs, mock_result_proj]
    
    with patch("app.worker.tasks.worker_session") as mock_ws_ctx:
        mock_ws_ctx.return_value.__enter__.return_value = mock_session
        
        res = recover_failed_jobs()
        assert res == "recovered_jobs"
        
        assert mock_job.status == "failed"
        assert "timed out" in mock_job.error_message
        assert mock_project.status == "FAILED"
        mock_session.commit.assert_called_once()
