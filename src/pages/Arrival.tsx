import { ChecklistCard, PageTitle } from "../components/content";
import type { SiteData } from "../domain/types";

export function Arrival({ site, onContact }: { site: SiteData; onContact: () => void }) {
  const list =
    site.checklists.find((item) => item.id === "arrival") || site.checklists[0];
  return (
    <section className="page section-shell">
      <PageTitle
        overline="抵韩后的第一周"
        title="抵达不是结束，安顿才是。"
        text="把学校报到、外国人登录相关手续、通信与银行卡等容易遗漏的事项，整理成一份更顺手的行动单。"
      />
      <div className="arrival-board">
        <div className="arrival-title">
          <span>SEOUL DESK / FIRST WEEK</span>
          <h2>落地后，按顺序办。</h2>
          <p>
            抵达后的行政手续会因学校、居住地与身份状态变化。下方内容用于准备和沟通，并非主管机关最终要求。
          </p>
          <button className="button red" onClick={onContact}>
            让顾问补齐个人清单
          </button>
        </div>
        <ChecklistCard list={list} />
      </div>
      <div className="arrival-cards">
        <article>
          <span>01</span>
          <h3>外国人登录相关手续</h3>
          <p>根据个人签证和入境状态，向学校国际处与主管机关核对预约、所需材料和时限。</p>
        </article>
        <article>
          <span>02</span>
          <h3>通信与银行卡</h3>
          <p>确认手机号实名、住址证明、学校文件与银行卡开户条件的先后顺序。</p>
        </article>
        <article>
          <span>03</span>
          <h3>熊猫卡办理</h3>
          <p>
            先确认当前可办理资格、渠道和材料；平台保留顾问咨询入口，避免将不确定信息写成承诺。
          </p>
        </article>
      </div>
    </section>
  );
}
