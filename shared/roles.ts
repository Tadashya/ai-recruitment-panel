export type Role = {
  id: string
  company: string
  title: string
  location: string
  employerType: "MNC" | "Startup" | "Corporate"
  skills: string[]
  minimumExperience: number
  education: string[]
  summary: string
  careersUrl: string
  illustrative: true
}

export const roles: Role[] = [
  {
    id: "atlas-frontend",
    company: "Microsoft (illustrative)",
    title: "Frontend Engineer",
    location: "Bengaluru · Hybrid",
    employerType: "MNC",
    skills: ["React", "TypeScript", "JavaScript", "CSS", "REST APIs", "Git"],
    minimumExperience: 2,
    education: ["bachelor", "computer science"],
    summary:
      "Build accessible, high-quality interfaces for a global cloud platform.",
    careersUrl: "https://jobs.careers.microsoft.com/global/en/search",
    illustrative: true,
  },
  {
    id: "northstar-product",
    company: "Razorpay (illustrative)",
    title: "Product Engineer",
    location: "Remote · India",
    employerType: "Startup",
    skills: ["React", "Node.js", "TypeScript", "SQL", "AWS", "Git"],
    minimumExperience: 3,
    education: [],
    summary:
      "Own product features from customer problem through production delivery.",
    careersUrl: "https://razorpay.com/jobs/",
    illustrative: true,
  },
  {
    id: "meridian-data",
    company: "Deloitte (illustrative)",
    title: "Data Analyst",
    location: "Mumbai · On-site",
    employerType: "Corporate",
    skills: ["SQL", "Python", "Excel", "Tableau", "Power BI", "Statistics"],
    minimumExperience: 2,
    education: ["bachelor"],
    summary:
      "Turn operational data into clear business decisions and reporting.",
    careersUrl: "https://www.deloitte.com/in/en/careers/search-jobs.html",
    illustrative: true,
  },
  {
    id: "orbit-backend",
    company: "Amazon (illustrative)",
    title: "Backend Developer",
    location: "Hyderabad · Hybrid",
    employerType: "MNC",
    skills: ["Node.js", "Python", "SQL", "REST APIs", "Docker", "AWS"],
    minimumExperience: 3,
    education: ["bachelor", "engineering"],
    summary:
      "Create reliable services and APIs used across enterprise products.",
    careersUrl: "https://www.amazon.jobs/en/search",
    illustrative: true,
  },
  {
    id: "sprout-designer",
    company: "Postman (illustrative)",
    title: "Product Designer",
    location: "Remote",
    employerType: "Startup",
    skills: ["Figma", "User Research", "Prototyping", "Design Systems", "CSS"],
    minimumExperience: 2,
    education: [],
    summary:
      "Shape simple, research-led experiences for a growing B2B product.",
    careersUrl: "https://www.postman.com/company/careers/",
    illustrative: true,
  },
  {
    id: "harbor-pm",
    company: "TCS (illustrative)",
    title: "Project Manager",
    location: "Pune · Hybrid",
    employerType: "Corporate",
    skills: ["Agile", "Scrum", "Jira", "Stakeholder Management", "Excel"],
    minimumExperience: 4,
    education: ["bachelor"],
    summary:
      "Coordinate cross-functional delivery for digital transformation programs.",
    careersUrl: "https://www.tcs.com/careers",
    illustrative: true,
  },
]
