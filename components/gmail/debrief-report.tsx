"use client";

import { GccLogo } from "@/components/brand/site-footer";
import { MdIcon } from "@/components/gmail/md-icon";
import { CLIENT, PRODUCT } from "@/lib/branding";
import type { DebriefReport } from "@/types/api";

function scoreTone(score: number): "good" | "ok" | "bad" {
  if (score >= 80) return "good";
  if (score >= 60) return "ok";
  return "bad";
}

export function DebriefReportView({
  report,
  onBack,
  onReset,
  resetting,
}: {
  report: DebriefReport;
  onBack: () => void;
  onReset?: () => void;
  resetting?: boolean;
}) {
  const tone = scoreTone(report.overallScore);
  const officersReached = report.timing.peopleContacted.length;
  const officersTotal = report.timing.officersTotal || officersReached;

  return (
    <div className="assess">
      <div className="assess-bar">
        <button type="button" className="assess-back" onClick={onBack}>
          <MdIcon name="arrow_back" size={18} />
          Inbox
        </button>
        <span>After-action assessment</span>
        {onReset ? (
          <button
            type="button"
            className="assess-reset"
            onClick={onReset}
            disabled={resetting}
          >
            {resetting ? "Resetting…" : "Reset exercise"}
          </button>
        ) : null}
      </div>

      <div className="assess-scroll">
        <article className="assess-sheet">
          <header className="assess-head">
            <div className="assess-brand">
              <GccLogo className="brand-logo-gcc assess-logo" />
              <p>
                {CLIENT.name}
                <small>
                  {PRODUCT.name} · Confidential · training use only
                </small>
              </p>
            </div>
            <div className={`assess-mark is-${tone}`}>
              <strong>{report.overallScore}</strong>
              <span>{report.grade}</span>
            </div>
          </header>

          <span className="assess-rule" aria-hidden="true" />

          <p className="assess-kicker">{report.scenarioTitle}</p>
          <h1>{report.headline}</h1>
          <p className="assess-byline">
            Prepared for {report.traineeName || "the DPO trainee"} acting as
            Data Protection Officer, AetherBank.
          </p>
          <p className="assess-summary">{report.summary}</p>

          <dl className="assess-stats">
            <div>
              <dt>Emails sent</dt>
              <dd>{report.timing.outboundCount}</dd>
            </div>
            <div>
              <dt>Within playbook</dt>
              <dd>{report.timing.compliantCount}</dd>
            </div>
            <div>
              <dt>Playbook gaps</dt>
              <dd>{report.timing.violationCount}</dd>
            </div>
            <div>
              <dt>Officers reached</dt>
              <dd>
                {officersReached}/{officersTotal || 6}
              </dd>
            </div>
          </dl>

          {officersReached > 0 ? (
            <p className="assess-people">{report.timing.peopleContacted.join(" · ")}</p>
          ) : null}

          <div className="assess-split">
            <section>
              <h2>What held</h2>
              {report.strengths.length ? (
                <ul>
                  {report.strengths.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="assess-empty">No compliant actions recorded.</p>
              )}
            </section>
            <section>
              <h2>What broke the SOP</h2>
              {report.gaps.length ? (
                <ul>
                  {report.gaps.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="assess-empty">No critical gaps flagged.</p>
              )}
            </section>
          </div>

          {report.nudges.length > 0 ? (
            <section>
              <h2>Warnings shown during the exercise</h2>
              <ol className="assess-warnings">
                {report.nudges.map((nudge, index) => (
                  <li key={`${nudge.at}-${index}`}>
                    <b>{nudge.toName}</b>
                    {nudge.reason}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {report.evaluations.length > 0 ? (
            <section>
              <h2>Each outbound email</h2>
              <table className="assess-table">
                <thead>
                  <tr>
                    <th>Finding</th>
                    <th>Officer</th>
                    <th>Your mail</th>
                  </tr>
                </thead>
                <tbody>
                  {report.evaluations.map((row, index) => (
                    <tr
                      key={`${row.toEmail}-${index}`}
                      className={row.violation ? "is-bad" : "is-good"}
                    >
                      <td>
                        <span
                          className={
                            row.violation ? "assess-flag is-bad" : "assess-flag is-good"
                          }
                        >
                          {row.violation ? "Gap" : "Held"}
                        </span>
                      </td>
                      <td>
                        <b>{row.toName}</b>
                        {row.reason ? (
                          <span className="assess-reason">{row.reason}</span>
                        ) : null}
                      </td>
                      <td>{row.excerpt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}

          <div className="assess-split">
            <section>
              <h2>Lessons</h2>
              <ol className="assess-steps">
                {report.lessons.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </section>
            <section>
              <h2>Next drill</h2>
              <ol className="assess-steps">
                {report.nextTime.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </section>
          </div>

          <p className="assess-end">
            This is a tabletop record, not a regulatory filing. Findings follow
            the GCC Data Protection ransomware playbook (PDPL).
          </p>
        </article>
      </div>
    </div>
  );
}
