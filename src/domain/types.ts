export type Major = {
  name: string;
  college?: string;
  degrees?: string[];
  note?: string;
  source?: string;
  updatedAt?: string;
};

export type MajorGroup = {
  id: string;
  name: string;
  aliases: string[];
  updatedAt?: string;
};

export type MajorCatalogRecord = { school: School; major: Major };

export type MajorCatalogEntry = {
  id: string;
  name: string;
  aliases: string[];
  records: MajorCatalogRecord[];
  grouped: boolean;
};

export type School = {
  id: string;
  name: string;
  nameKr: string;
  city: string;
  type: string;
  rank: number;
  worldQsRank?: string;
  asiaQsRank?: string;
  tags: string[];
  intro: string;
  website?: string;
  degrees: string[];
  majors: string[];
  majorDetails?: Major[];
  updatedAt?: string;
  homeVisible?: boolean;
};

export type Rule = {
  id: string;
  name: string;
  degree: string;
  majorKeywords: string[];
  minGpa: number;
  language: string;
  budget: string;
  schoolIds: string[];
  reason: string;
};

export type Step = {
  id: string;
  index: string;
  title: string;
  summary: string;
  link: Page;
};

export type JourneyMapNode = {
  id: string;
  stage: string;
  title: string;
  summary: string;
  link: Page;
};

export type Checklist = { id: string; title: string; items: string[] };

export type Resource = {
  id: string;
  label: string;
  title: string;
  desc: string;
  type: string;
};

export type VisaGuide = {
  id: string;
  group?: string;
  label: string;
  visa: string;
  qualification: string;
  title: string;
  intro: string;
  materials: string[];
  reminders: string[];
  updatedAt: string;
};

export type Session = {
  token: string;
  user: { username: string; role: "admin" | "user" };
};

export type SiteData = {
  meta: {
    updatedAt: string;
    schemaVersion: number;
    distribution?: string;
    dataAsOf?: string;
    notice?: string;
  };
  brand: {
    name: string;
    eyebrow: string;
    heroTitle: string;
    heroSummary: string;
    notice: string;
  };
  consultant: {
    name: string;
    wechat: string;
    availability: string;
    qrTarget: string;
    note: string;
  };
  schools: School[];
  majorGroups?: MajorGroup[];
  recommendationRules: Rule[];
  serviceSteps: Step[];
  journeyMap: JourneyMapNode[];
  checklists: Checklist[];
  resources: Resource[];
  visaGuides?: VisaGuide[];
  faqs: { id: string; q: string; a: string }[];
  leads: {
    id: string;
    createdAt: string;
    name?: string;
    contact?: string;
    intent?: string;
  }[];
};

export type Page =
  | "home"
  | "schools"
  | "majors"
  | "matcher"
  | "journey"
  | "arrival"
  | "resources"
  | "faq"
  | "admin";
