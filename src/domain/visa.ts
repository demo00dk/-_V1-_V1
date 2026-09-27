import type { SiteData, VisaGuide } from "./types";

export const sharedVisaMaterials = [
  "签证申请表（可自行打印填写或签证中心现场填写）",
  "6个月内白底证件照（3.5*4.5cm）",
  "护照原件",
  "身份证原件及复印件",
  "肺结核诊断书+检测报告",
  "韩国大学标准入学许可书",
  "大学事业者登录证",
  "学信网学位验证报告（中文即可）",
  "存款证明（开具日期30天内）",
  "个人信息同意书",
];

export const defaultVisaGuides: VisaGuide[] = [
  {
    id: "bachelor-high",
    group: "bachelor",
    label: "本科新入（高中）",
    visa: "D-2-2",
    qualification: "高中毕业生 · 学士学位课程",
    title: "高中毕业生本科签证材料",
    intro: "适用于以普通高中学历进入韩国大学本科新入课程的学生。",
    updatedAt: "26.8",
    materials: [
      "签证申请表及近期白底证件照",
      "有效护照原件及个人信息页复印件",
      "身份证原件及复印件",
      "韩国大学签发的标准入学许可书",
      "学校事业者登录证或固有号码证复印件",
      "高中毕业证或预毕业证明及所需认证材料",
      "高中阶段完整成绩证明",
      "学费缴纳证明或学校要求的缴费材料",
      "本人或父母名义的经济能力证明",
      "使用父母资金时的亲属关系及资助材料",
      "领区要求的肺结核检测证明（如适用）",
      "所属领馆或签证中心要求的其他补充材料",
    ],
    reminders: [
      "应届高中生应确认预毕业材料是否可用，以及正式毕业后的补交时限。",
      "存款金额、冻结期和出具时间以录取学校及申请领区当期要求为准。",
    ],
  },
  {
    id: "bachelor-vocational",
    group: "bachelor",
    label: "本科新入（中专）",
    visa: "D-2-2",
    qualification: "中专毕业生 · 学士学位课程",
    title: "中专毕业生本科签证材料",
    intro: "适用于以中等专业学校等同等学历进入韩国大学本科新入课程的学生。",
    updatedAt: "26.8",
    materials: [
      "签证申请表及近期白底证件照",
      "有效护照原件及个人信息页复印件",
      "身份证原件及复印件",
      "韩国大学签发的标准入学许可书",
      "学校事业者登录证或固有号码证复印件",
      "中专毕业证或预毕业证明",
      "中专阶段完整成绩证明",
      "学校或领区要求的学历、学籍真实性核验材料",
      "学费缴纳证明或学校要求的缴费材料",
      "本人或父母名义的经济能力证明",
      "使用父母资金时的亲属关系及资助材料",
      "肺结核检测及所属领区要求的其他补充材料（如适用）",
    ],
    reminders: [
      "中专、职高和技校的学历认定方式并不完全相同，必须先由录取学校确认可申请资格。",
      "学历认证或真实性核验渠道以学校和所属申请领区的当期要求为准。",
    ],
  },
  {
    id: "bachelor-transfer",
    group: "bachelor",
    label: "专升本",
    visa: "D-2-2",
    qualification: "本科插班 · 学士学位课程",
    title: "专升本签证材料",
    intro: "适用于凭专科或既有本科经历进入韩国大学本科插班课程的学生。",
    updatedAt: "26.8",
    materials: [
      "签证申请表及近期白底证件照",
      "有效护照原件及个人信息页复印件",
      "身份证原件及复印件",
      "韩国大学签发的标准入学许可书",
      "学校事业者登录证或固有号码证复印件",
      "专科或本科毕业、预毕业或在读证明及所需认证材料",
      "专科或本科阶段完整成绩证明",
      "课程修读、学分或学籍经历证明（学校要求时）",
      "最终高中学历材料（学校或领区要求时）",
      "学费缴纳证明或学校要求的缴费材料",
      "本人或父母名义的经济能力及亲属关系材料",
      "肺结核检测及所属领区要求的其他补充材料（如适用）",
    ],
    reminders: [
      "两年制插班与一年制专升本对前置学历、学分和入学年级的要求不同。",
      "签证同属 D-2-2，但递交前应按录取通知和所属领区重新核对材料。",
    ],
  },
  {
    id: "master",
    label: "硕士",
    visa: "D-2-3",
    qualification: "硕士学位课程",
    title: "硕士留学签证材料",
    intro: "适用于进入韩国大学硕士或硕博连读前段课程的学生。",
    updatedAt: "26.8",
    materials: [
      "签证申请表及近期白底证件照",
      "有效护照原件及个人信息页复印件",
      "身份证原件及复印件",
      "韩国大学签发的标准入学许可书",
      "学校事业者登录证或固有号码证复印件",
      "本科毕业证与学位证及所需认证材料",
      "本科完整成绩证明",
      "学费缴纳证明或学校要求的缴费材料",
      "本人或父母名义的经济能力证明",
      "使用父母资金时的亲属关系及资助材料",
      "领区要求的肺结核检测证明（如适用）",
      "所属领馆或签证中心要求的其他补充材料",
    ],
    reminders: [
      "应届生须确认临时毕业材料是否可用，并按学校要求补交正式学位材料。",
      "硕博连读的签证类别以标准入学许可书和学校确认结果为准。",
    ],
  },
  {
    id: "doctor",
    label: "博士",
    visa: "D-2-4",
    qualification: "博士学位课程",
    title: "博士留学签证材料",
    intro: "适用于进入韩国大学博士学位课程或对应统合课程的学生。",
    updatedAt: "26.8",
    materials: [
      "签证申请表及近期白底证件照",
      "有效护照原件及个人信息页复印件",
      "身份证原件及复印件",
      "韩国大学签发的标准入学许可书",
      "学校事业者登录证或固有号码证复印件",
      "硕士毕业证与学位证及所需认证材料",
      "硕士阶段完整成绩证明",
      "学费缴纳证明或奖学金证明（如适用）",
      "本人或父母名义的经济能力证明",
      "使用父母资金时的亲属关系及资助材料",
      "领区要求的肺结核检测证明（如适用）",
      "所属领馆或签证中心要求的其他补充材料",
    ],
    reminders: [
      "获得全额奖学金时，经济能力材料能否减免应由学校和申请领区确认。",
      "研究课程、交换项目与普通博士学位课程的签证小类不同，不要混用清单。",
    ],
  },
  {
    id: "language",
    label: "语学院",
    visa: "D-4-1",
    qualification: "韩国语研修课程",
    title: "语学院签证材料",
    intro: "适用于在韩国大学附属语学院参加九十天以上韩国语研修的学生。",
    updatedAt: "26.8",
    materials: sharedVisaMaterials,
    reminders: [
      "D-4-1 是语言研修签证，不适用于本科、硕士或博士学位课程。",
      "部分学校会先审查存款、空白期与学习计划，再出具入学许可材料。",
    ],
  },
].map((guide) => ({ ...guide, materials: [...sharedVisaMaterials] }));

export const getVisaGuides = (site: SiteData) =>
  site.visaGuides?.length ? site.visaGuides : defaultVisaGuides;

export const visaCategoryOrder = ["bachelor", "master", "doctor", "language"];

export const visaCategoryMeta: Record<string, { label: string; visa: string }> = {
  bachelor: { label: "本科", visa: "D-2-2" },
  master: { label: "硕士", visa: "D-2-3" },
  doctor: { label: "博士", visa: "D-2-4" },
  language: { label: "语学院", visa: "D-4-1" },
};

export const visaGuideCategory = (guide: VisaGuide) => guide.group || guide.id;

export const visaGuideBadge = (guide: VisaGuide) =>
  guide.id === "bachelor-high"
    ? "高中"
    : guide.id === "bachelor-vocational"
      ? "中专"
      : guide.id === "bachelor-transfer"
        ? "专升本"
        : guide.label;
