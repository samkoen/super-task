"""Modèles HTML des e-mails transactionnels (hébreu, RTL)."""

from __future__ import annotations

import html

_EMAIL_STYLES = """
  body, table, td { direction: rtl; text-align: right; }
  .wrapper { width: 100%; background-color: #f0f4f3; padding: 24px 0; }
  .card {
    max-width: 520px; margin: 0 auto; background: #ffffff;
    border-radius: 8px; border: 1px solid #e0e4e8;
  }
  .content { padding: 28px 32px; font-family: 'Heebo', 'Segoe UI', Arial, sans-serif;
    font-size: 16px; line-height: 1.65; color: #1a2332; text-align: right; }
  .greeting { margin: 0 0 16px; font-size: 18px; font-weight: 600; }
  .para { margin: 0 0 14px; }
  .btn-wrap { margin: 24px 0; text-align: right; }
  .btn {
    display: inline-block; padding: 12px 28px;
    background-color: #0B7B6A; color: #ffffff !important;
    text-decoration: none; border-radius: 6px; font-weight: 600;
    font-size: 16px;
  }
  .link-label { margin: 20px 0 8px; font-size: 14px; color: #555; }
  .link-box {
    direction: ltr; text-align: left; word-break: break-all;
    font-size: 13px; color: #0B7B6A; background: #f0f4f3;
    border: 1px solid #c5d9d5; border-radius: 4px; padding: 12px 14px;
    margin: 0 0 20px;
  }
  .footer { margin: 0; font-size: 13px; color: #888; }
"""


def verification_email_html(*, app_name: str, full_name: str, verify_url: str) -> str:
    safe_name = html.escape((full_name or "").strip() or "משתמש")
    safe_app = html.escape(app_name)
    safe_url = html.escape(verify_url)
    return f"""<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style type="text/css">{_EMAIL_STYLES}</style>
</head>
<body style="margin:0;padding:0;direction:rtl;text-align:right;background:#f0f4f3;">
  <table class="wrapper" role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="rtl">
    <tr>
      <td align="right" style="padding:24px 16px;">
        <table class="card" role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="rtl">
          <tr>
            <td class="content" dir="rtl" align="right">
              <p class="greeting">שלום {safe_name},</p>
              <p class="para">תודה שנרשמת ל־<strong>{safe_app}</strong>.</p>
              <p class="para">לאימות כתובת האימייל שלך, לחץ על הכפתור:</p>
              <table class="btn-wrap" role="presentation" cellpadding="0" cellspacing="0" dir="rtl">
                <tr>
                  <td align="right">
                    <a href="{safe_url}" class="btn">אימות אימייל</a>
                  </td>
                </tr>
              </table>
              <p class="link-label">אם הכפתור לא עובד, העתק את הקישור לדפדפן:</p>
              <div class="link-box" dir="ltr">
                <a href="{safe_url}" style="color:#0B7B6A;text-decoration:none;">{safe_url}</a>
              </div>
              <p class="footer">אם לא ביקשת הרשמה, ניתן להתעלם מהודעה זו.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def invitation_email_html(
    *,
    app_name: str,
    invite_url: str,
    role_label: str,
    job_function_label: str | None = None,
) -> str:
    safe_app = html.escape(app_name)
    safe_url = html.escape(invite_url)
    safe_role = html.escape(role_label)
    role_line = f"<p class=\"para\">תפקיד: <strong>{safe_role}</strong></p>"
    job_line = ""
    if job_function_label:
        safe_job = html.escape(job_function_label)
        job_line = f"<p class=\"para\">תפקיד עובד: <strong>{safe_job}</strong></p>"
    return f"""<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style type="text/css">{_EMAIL_STYLES}</style>
</head>
<body style="margin:0;padding:0;direction:rtl;text-align:right;background:#f0f4f3;">
  <table class="wrapper" role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="rtl">
    <tr>
      <td align="right" style="padding:24px 16px;">
        <table class="card" role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="rtl">
          <tr>
            <td class="content" dir="rtl" align="right">
              <p class="greeting">שלום,</p>
              <p class="para">הוזמנת להצטרף ל־<strong>{safe_app}</strong>.</p>
              {role_line}
              {job_line}
              <p class="para">להשלמת ההרשמה, לחץ על הכפתור:</p>
              <table class="btn-wrap" role="presentation" cellpadding="0" cellspacing="0" dir="rtl">
                <tr>
                  <td align="right">
                    <a href="{safe_url}" class="btn">השלמת הרשמה</a>
                  </td>
                </tr>
              </table>
              <p class="link-label">אם הכפתור לא עובד, העתק את הקישור לדפדפן:</p>
              <div class="link-box" dir="ltr">
                <a href="{safe_url}" style="color:#0B7B6A;text-decoration:none;">{safe_url}</a>
              </div>
              <p class="footer">אם לא ציפית להזמנה זו, ניתן להתעלם מהודעה זו.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
