/**
 * Kinetra CRM — outbound email templates (Phase 5).
 *
 * Plain TypeScript constants (client-safe: imported by the composer dialog).
 * Placeholders — {{lead_name}}, {{admin_name}}, {{project_type}} — are
 * substituted by renderLeadEmailTemplate() when a template is selected, and
 * the admin can freely edit the result before sending.
 */

export const LEAD_EMAIL_TEMPLATE_IDS = [
  "thank_you",
  "follow_up",
  "proposal_ready",
  "project_started",
  "custom",
] as const;

export type LeadEmailTemplateId = (typeof LEAD_EMAIL_TEMPLATE_IDS)[number];

export interface LeadEmailTemplate {
  id: LeadEmailTemplateId;
  label: string;
  subject: string;
  body: string;
}

export const LEAD_EMAIL_TEMPLATES: readonly LeadEmailTemplate[] = [
  {
    id: "thank_you",
    label: "Thank You",
    subject: "Thanks for reaching out to Kinetra Studios",
    body: `Hi {{lead_name}},

Thank you for getting in touch about {{project_type}} — we're glad your project found its way to us.

We've received your inquiry and are reviewing the details now. You can expect to hear back from us within one business day with next steps (and usually a few questions — good edits start with good questions).

In the meantime, feel free to reply to this email with any references, footage links, or deadlines we should know about.

Talk soon,
{{admin_name}}
Kinetra Studios — Edited for impact.`,
  },
  {
    id: "follow_up",
    label: "Follow Up",
    subject: "Following up on your project inquiry",
    body: `Hi {{lead_name}},

Just circling back on the {{project_type}} inquiry you sent our way — we didn't want it slipping through the cracks.

If you're still exploring, we'd love 15 minutes to talk scope, timeline, and what "done" looks like for you. If the timing has changed, no problem at all — just let us know where things stand.

Reply here and we'll take it from there.

Best,
{{admin_name}}
Kinetra Studios — Edited for impact.`,
  },
  {
    id: "proposal_ready",
    label: "Proposal Ready",
    subject: "Your Kinetra Studios proposal is ready",
    body: `Hi {{lead_name}},

Good news — your proposal for {{project_type}} is ready.

It covers the creative approach, deliverables, timeline, and investment, based on everything you shared with us. We kept it sharp: what we'll make, when you'll have it, and what it costs.

Reply to this email and we'll send it over (or walk you through it live — often the faster way to a decision).

Looking forward to it,
{{admin_name}}
Kinetra Studios — Edited for impact.`,
  },
  {
    id: "project_started",
    label: "Project Started",
    subject: "We're rolling — your project has started",
    body: `Hi {{lead_name}},

It's official: your {{project_type}} project is underway. REC light is on.

Here's what happens next:
1. We lock the brief and gather your footage/assets.
2. First cut lands in your inbox for review.
3. We refine together until it's right.

If anything changes on your side — footage, deadlines, priorities — just reply here and we'll adjust.

Let's make something great,
{{admin_name}}
Kinetra Studios — Edited for impact.`,
  },
  {
    id: "custom",
    label: "Custom",
    subject: "",
    body: "",
  },
];

export interface LeadEmailTemplateContext {
  leadName: string;
  adminName: string;
  projectType: string | null;
}

/** Fill a template's placeholders with real lead/admin context. */
export function renderLeadEmailTemplate(
  template: LeadEmailTemplate,
  context: LeadEmailTemplateContext,
): { subject: string; body: string } {
  const projectType =
    context.projectType && context.projectType.trim() !== ""
      ? context.projectType
      : "your project";

  const substitute = (value: string): string =>
    value
      .replaceAll("{{lead_name}}", context.leadName)
      .replaceAll("{{admin_name}}", context.adminName)
      .replaceAll("{{project_type}}", projectType);

  return {
    subject: substitute(template.subject),
    body: substitute(template.body),
  };
}