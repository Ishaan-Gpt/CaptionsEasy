import React from "react";
import { getTemplate } from "./registry";
import type { PageRenderProps } from "./types";

/**
 * Renders ONE derived page with the template named by style.templateId. Pure in its props, so it is
 * identical in the browser Player and in renderMedia (the WYSIWYG guarantee).
 */
export const PageView: React.FC<PageRenderProps> = (props) => {
  const { page, timeMs } = props;
  if (page.words.length === 0) return null;
  if (timeMs < page.startMs || timeMs >= page.endMs) return null;
  const Template = getTemplate(props.style.templateId).Page;
  return <Template {...props} />;
};
