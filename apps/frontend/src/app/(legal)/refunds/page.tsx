import type { Metadata } from "next";
import { LegalDoc, Sec } from "@/components/legal/Doc";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Refunds & Cancellation · CaptionsEasy", description: "How cancelling and refunds work for CaptionsEasy paid plans." };

export default function RefundsPage() {
  return (
    <LegalDoc
      title="Refunds &"
      accent="Cancellation"
      intro={<>{LEGAL.product} is free to use today. When paid plans launch, this is how cancelling and refunds will work. We keep it simple and fair.</>}
    >
      <Sec id="free" title="Free plan">
        <p>The Free plan costs nothing and needs no card. You can stop using it or close your account at any time.</p>
      </Sec>

      <Sec id="cancel" title="Cancelling a subscription">
        <ul>
          <li>You can cancel a monthly or yearly subscription at any time from your account settings, or by emailing {LEGAL.email}.</li>
          <li>Cancelling stops the next renewal. You keep paid features until the end of the period you already paid for, then move to the Free plan. Your projects stay; anything over the Free limits becomes read-only until you upgrade again or remove it.</li>
        </ul>
      </Sec>

      <Sec id="refunds" title="Refunds">
        <ul>
          <li><strong>First purchase:</strong> if {LEGAL.product} is not right for you, ask within 14 days of your first payment for a full refund, no questions asked.</li>
          <li><strong>Renewals:</strong> if a renewal charged you by surprise and you have not used paid features since, ask within 7 days and we will refund it.</li>
          <li><strong>Service problems:</strong> if a serious outage or bug on our side stopped you using paid features, we will refund or credit the affected time.</li>
          <li>Otherwise, payments for a period already started are not refundable, except where the law gives you a right to a refund.</li>
        </ul>
        <p>Refunds go back to the original payment method, usually within 5 to 10 business days of approval, depending on your bank.</p>
      </Sec>

      <Sec id="changes" title="Price changes">
        <p>We will tell you about any price change before it applies to your next renewal, so you can cancel first if you prefer.</p>
      </Sec>
    </LegalDoc>
  );
}
