import { roles, type Role } from "./roles"

const skillCatalog = [
  "React",
  "TypeScript",
  "JavaScript",
  "HTML",
  "CSS",
  "Node.js",
  "Python",
  "Java",
  "C++",
  "SQL",
  "MongoDB",
  "AWS",
  "Azure",
  "Docker",
  "Kubernetes",
  "Git",
  "REST APIs",
  "GraphQL",
  "Figma",
  "User Research",
  "Prototyping",
  "Design Systems",
  "Excel",
  "Tableau",
  "Power BI",
  "Statistics",
  "Agile",
  "Scrum",
  "Jira",
  "Stakeholder Management",
]

const aliases: Record<string, string[]> = {
  "Node.js": ["node.js", "nodejs", "node js"],
  "REST APIs": ["rest api", "rest apis", "restful"],
  "Power BI": ["power bi", "powerbi"],
  "C++": ["c++"],
}

function includesTerm(text: string, term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text)
}

function extractSkills(text: string) {
  return skillCatalog.filter((skill) => {
    const terms = aliases[skill] ?? [skill.toLowerCase()]
    return terms.some((term) => includesTerm(text, term))
  })
}

function extractEducation(text: string) {
  const terms = [
    ["Master's degree", /\b(master'?s|m\.?tech|m\.?s\.?|mba)\b/i],
    ["Bachelor's degree", /\b(bachelor'?s|b\.?tech|b\.?e\.?|b\.?s\.?|bsc)\b/i],
    ["Computer Science", /\b(computer science|computer engineering)\b/i],
    ["Engineering", /\bengineering\b/i],
    ["Business", /\b(business administration|commerce|management)\b/i],
  ] as const
  return terms
    .filter(([, pattern]) => pattern.test(text))
    .map(([label]) => label)
}

function extractExperience(text: string) {
  const matches = [
    ...text.matchAll(
      /(\d{1,2})(?:\+)?\s*(?:years?|yrs?)(?:\s+of)?\s+(?:work\s+)?experience/gi,
    ),
  ]
  const values = matches
    .map((match) => Number(match[1]))
    .filter((value) => value <= 50)
  if (values.length === 0) {
    const looser = [...text.matchAll(/(\d{1,2})(?:\+)?\s*(?:years?|yrs?)\b/gi)]
      .map((match) => Number(match[1]))
      .filter((value) => value <= 50)
    return looser.length ? Math.max(...looser) : 0
  }
  return Math.max(...values)
}

function educationMatches(profileEducation: string[], role: Role) {
  if (!role.education.length) return true
  const normalized = profileEducation.join(" ").toLowerCase()
  return role.education.some((keyword) => normalized.includes(keyword))
}

function scoreRole(
  skills: string[],
  education: string[],
  experience: number,
  role: Role,
) {
  const matchedSkills = role.skills.filter((required) =>
    skills.some((skill) => skill.toLowerCase() === required.toLowerCase()),
  )
  const skillScore = role.skills.length
    ? (matchedSkills.length / role.skills.length) * 70
    : 70
  const experienceScore =
    role.minimumExperience === 0
      ? 15
      : Math.min(experience / role.minimumExperience, 1) * 15
  const hasEducation = educationMatches(education, role)
  const educationScore = hasEducation ? 15 : 0
  const score = Math.round(skillScore + experienceScore + educationScore)

  const skillDetail = matchedSkills.length
    ? `${matchedSkills.length} of ${role.skills.length} role skills matched`
    : `No required skills were directly identified`
  const experienceDetail =
    experience >= role.minimumExperience
      ? `stated experience meets the ${role.minimumExperience}-year guideline`
      : `${experience} stated years versus a ${role.minimumExperience}-year guideline`
  const educationDetail = role.education.length
    ? hasEducation
      ? "the education guideline appears to match"
      : "the education guideline was not identified"
    : "this sample role has no education requirement"

  return {
    id: role.id,
    company: role.company,
    title: role.title,
    location: role.location,
    employerType: role.employerType,
    summary: role.summary,
    careersUrl: role.careersUrl,
    matchScore: score,
    matchedSkills,
    requiredSkills: role.skills,
    minimumExperience: role.minimumExperience,
    explanation: `${skillDetail}; ${experienceDetail}; ${educationDetail}. Skills contribute 70%, experience 15%, and education 15%.`,
    illustrative: true as const,
  }
}

function assessAts(text: string, skills: string[]) {
  const wordCount = text.split(/\s+/).filter(Boolean).length
  const hasContact =
    /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i.test(text) ||
    /(?:\+?\d[\s().-]*){8,}/.test(text)
  const sections = {
    summary: /\b(summary|profile|objective)\b/i.test(text),
    experience: /\b(experience|employment|work history)\b/i.test(text),
    skills: /\b(skills|technologies|competencies)\b/i.test(text),
    education: /\b(education|academic|qualification)\b/i.test(text),
  }
  const sectionCount = Object.values(sections).filter(Boolean).length
  const quantifiedAchievements = (
    text.match(
      /\b(?:increased|improved|reduced|grew|saved|delivered|managed|led|built)[^.!?\n]{0,80}(?:\d+%?|\$[\d,.]+)/gi,
    ) ?? []
  ).length
  const actionVerbs = (
    text.match(
      /\b(?:built|created|delivered|developed|designed|improved|increased|led|managed|reduced|implemented|launched|optimized)\b/gi,
    ) ?? []
  ).length

  const contactScore = hasContact ? 10 : 0
  const sectionScore = Math.round((sectionCount / 4) * 25)
  const lengthScore =
    wordCount >= 250 && wordCount <= 1000
      ? 15
      : wordCount >= 120 && wordCount <= 1300
        ? 8
        : 3
  const skillScore =
    skills.length >= 8 ? 20 : skills.length >= 4 ? 14 : skills.length ? 7 : 0
  const achievementScore =
    quantifiedAchievements >= 3
      ? 20
      : quantifiedAchievements
        ? 12
        : actionVerbs >= 3
          ? 6
          : 0
  const readabilityScore =
    text.length >= 100 && text.split(/\n/).length >= 4 ? 10 : 6
  const score = Math.min(
    100,
    contactScore +
      sectionScore +
      lengthScore +
      skillScore +
      achievementScore +
      readabilityScore,
  )

  const suggestions: string[] = []
  if (!hasContact)
    suggestions.push(
      "Add a professional email address and phone number near the top.",
    )
  if (sectionCount < 4) {
    const missing = Object.entries(sections)
      .filter(([, present]) => !present)
      .map(([name]) => name)
    suggestions.push(
      `Add clear ${missing.join(", ")} section headings so ATS software can classify your content.`,
    )
  }
  if (wordCount < 250)
    suggestions.push(
      "Add relevant accomplishment detail; most effective resumes contain at least 250 words.",
    )
  if (wordCount > 1000)
    suggestions.push(
      "Reduce the resume to the most relevant experience and keep it under about 1,000 words.",
    )
  if (skills.length < 8)
    suggestions.push(
      "Add more role-relevant hard skills that you genuinely possess.",
    )
  if (quantifiedAchievements < 3) {
    suggestions.push(
      "Turn responsibilities into achievements using truthful numbers, percentages, scale, or outcomes.",
    )
  }

  return {
    estimatedScore: score,
    label:
      score >= 80
        ? "Strong"
        : score >= 60
          ? "Good foundation"
          : "Needs improvement",
    disclaimer:
      "This is a transparent heuristic estimate, not a guarantee of performance in any employer's ATS.",
    wordCount,
    checks: [
      {
        label: "Contact details",
        passed: hasContact,
        detail: hasContact
          ? "Email or phone detected"
          : "No email or phone detected",
      },
      {
        label: "Standard sections",
        passed: sectionCount === 4,
        detail: `${sectionCount} of 4 common sections detected`,
      },
      {
        label: "Relevant skills",
        passed: skills.length >= 8,
        detail: `${skills.length} catalogued skills detected`,
      },
      {
        label: "Measurable impact",
        passed: quantifiedAchievements >= 3,
        detail: `${quantifiedAchievements} quantified achievement${
          quantifiedAchievements === 1 ? "" : "s"
        } detected`,
      },
      {
        label: "Resume length",
        passed: wordCount >= 250 && wordCount <= 1000,
        detail: `${wordCount} words detected`,
      },
    ],
    suggestions,
  }
}

function createImprovedDraft(
  text: string,
  skills: string[],
  experienceYears: number,
) {
  const summaryParts = [
    experienceYears > 0
      ? `Professional with ${experienceYears} years of stated experience`
      : "Professional candidate",
    skills.length ? `with experience in ${skills.slice(0, 6).join(", ")}` : "",
  ].filter(Boolean)
  const normalized = text
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

  return [
    "PROFESSIONAL SUMMARY",
    `${summaryParts.join(" ")}. Review and tailor this summary to the target role before applying.`,
    "",
    ...(skills.length ? ["CORE SKILLS", skills.join(" • "), ""] : []),
    "RESUME CONTENT",
    normalized,
  ].join("\n")
}

export function matchResume(rawText: string, fileName: string) {
  const readableText = rawText
    .replace(/\0/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim()
  const text = readableText.replace(/\s+/g, " ")
  if (text.length < 40) {
    throw new Error(
      "We could not find enough readable text. If this is an image-only PDF, run OCR and try again.",
    )
  }

  const skills = extractSkills(text)
  const education = extractEducation(text)
  const experienceYears = extractExperience(text)
  const atsReview = assessAts(readableText, skills)
  const matches = roles
    .map((role) => scoreRole(skills, education, experienceYears, role))
    .sort((a, b) => b.matchScore - a.matchScore)

  return {
    source: "illustrative_sample_data" as const,
    sourceNotice:
      "These matches use illustrative sample roles, not current vacancies. Verify opportunities directly with employers.",
    processedFile: fileName.replace(/[^\w.\- ()]/g, "").slice(0, 120),
    profile: { skills, education, experienceYears },
    atsReview,
    improvedResumeText: createImprovedDraft(
      readableText,
      skills,
      experienceYears,
    ),
    matches,
    methodology: {
      skills: 70,
      experience: 15,
      education: 15,
      excluded:
        "Names, age, gender, ethnicity, disability, photographs, and other protected or irrelevant characteristics are not used.",
    },
  }
}
