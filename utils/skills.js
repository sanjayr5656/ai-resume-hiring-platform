const canonical = value => {
  if (!value) return '';
  let s = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9+#./\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  const aliases = {
    'reactjs': 'react',
    'react.js': 'react',
    'react js': 'react',
    'node': 'node.js',
    'nodejs': 'node.js',
    'node.js': 'node.js',
    'node js': 'node.js',
    'js': 'javascript',
    'ts': 'typescript',
    'mongo': 'mongodb',
    'mongo db': 'mongodb',
    'express js': 'express',
    'express.js': 'express',
    'expressjs': 'express',
    'rest api': 'rest apis',
    'rest apis': 'rest apis',
    'restful api': 'rest apis',
    'restful apis': 'rest apis',
    'rest': 'rest apis',
    'postgres': 'postgresql',
    'psql': 'postgresql',
    'k8s': 'kubernetes',
    'aws': 'aws',
    'amazon web services': 'aws',
    'gcp': 'google cloud',
    'google cloud platform': 'google cloud',
    'vue js': 'vue',
    'vuejs': 'vue',
    'angular js': 'angular',
    'angularjs': 'angular',
    'html5': 'html',
    'css3': 'css',
    'ci_cd': 'ci/cd',
    'ci cd': 'ci/cd',
    'cicd': 'ci/cd',
    'redux toolkit': 'redux',
    'tailwind': 'tailwindcss',
    'tailwind css': 'tailwindcss',
    'next': 'next.js',
    'nextjs': 'next.js',
    'next.js': 'next.js',
    'dsa': 'data structures and algorithms',
    'data structures & algorithms': 'data structures and algorithms',
    'data structures & algorithms (dsa)': 'data structures and algorithms',
    'data structures and algorithms (dsa)': 'data structures and algorithms',
    'oop': 'object oriented programming',
    'oops': 'object oriented programming',
    'ai': 'artificial intelligence'
  };

  return aliases[s] || s;
};

// Map related technologies for partial credit (0.5 credit)
const relatedSkillsMap = {
  'react': ['next.js', 'redux', 'javascript', 'typescript', 'vue', 'angular'],
  'node.js': ['express', 'javascript', 'typescript', 'nest.js', 'rest apis'],
  'express': ['node.js', 'rest apis', 'fastify', 'koa'],
  'mongodb': ['nosql', 'mongoose', 'postgresql', 'mysql', 'database'],
  'postgresql': ['sql', 'mysql', 'sqlite', 'mongodb', 'database'],
  'rest apis': ['graphql', 'node.js', 'express', 'fastapi'],
  'docker': ['kubernetes', 'containers', 'devops', 'aws', 'ci/cd'],
  'kubernetes': ['docker', 'devops', 'cloud', 'aws'],
  'aws': ['cloud', 'gcp', 'azure', 'devops', 'docker'],
  'typescript': ['javascript', 'react', 'node.js'],
  'javascript': ['typescript', 'react', 'node.js', 'html', 'css'],
  'python': ['django', 'fastapi', 'flask', 'data science', 'ai', 'machine learning'],
  'java': ['spring', 'spring boot', 'oop', 'backend'],
  'data structures and algorithms': ['dsa', 'problem solving', 'algorithms', 'computer science']
};

/**
 * Break compound requirement phrases into candidate sub-skills
 * (Handles recruiters pasting entire paragraphs or multi-skill sentences)
 */
function extractSubSkills(phrase) {
  if (!phrase) return [];
  const rawParts = String(phrase)
    .split(/[,;:•/()&+\n\r]+|\bor\b|\band\b/i)
    .map(p => p.trim())
    .filter(p => p.length >= 2 && p.length <= 40);

  const cleaned = [];
  for (const part of rawParts) {
    const canon = canonical(part);
    if (canon && !/^(proficiency|experience|knowledge|foundation|familiarity|strong|hands-on|coursework|like|solid|related|technical|such as)$/i.test(canon)) {
      cleaned.push(canon);
    }
  }
  return cleaned;
}

/**
 * Check if actual skill matches required skill (exact, canonical alias, sub-skill compound, or related partial)
 */
function matchSkill(requiredSkill, actualSkillsSet) {
  const reqCanon = canonical(requiredSkill);
  if (actualSkillsSet.has(reqCanon)) {
    return { matched: true, score: 1.0, relation: 'exact' };
  }

  // Check prefix or partial phrase match
  for (const actual of actualSkillsSet) {
    if (actual.includes(reqCanon) || reqCanon.includes(actual)) {
      return { matched: true, score: 0.9, relation: 'alias' };
    }
  }

  // Check compound requirement phrases
  const subSkills = extractSubSkills(requiredSkill);
  for (const sub of subSkills) {
    if (actualSkillsSet.has(sub)) {
      return { matched: true, score: 0.9, relation: `compound match (${sub})` };
    }
    for (const actual of actualSkillsSet) {
      if (actual.includes(sub) || sub.includes(actual)) {
        return { matched: true, score: 0.85, relation: `compound alias (${sub})` };
      }
    }
  }

  // Check related skills for partial credit
  const related = relatedSkillsMap[reqCanon] || [];
  for (const rel of related) {
    if (actualSkillsSet.has(canonical(rel))) {
      return { matched: true, score: 0.5, relation: `related (${rel})` };
    }
  }

  return { matched: false, score: 0, relation: 'none' };
}

/**
 * Check if a skill is evidenced in projects or experience text
 */
function isSkillEvidenced(skill, projects = [], experience = []) {
  const cSkill = canonical(skill);
  const regex = new RegExp(`(^|[^a-z0-9])${cSkill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i');

  for (const p of projects) {
    const techList = Array.isArray(p.technologies) ? p.technologies.map(canonical) : [];
    if (techList.includes(cSkill)) return true;
    const text = `${p.name || ''} ${p.description || ''}`;
    if (regex.test(text.toLowerCase())) return true;
  }

  for (const e of experience) {
    const text = `${e.title || ''} ${e.description || ''}`;
    if (regex.test(text.toLowerCase())) return true;
  }

  return false;
}

/**
 * Generate structured "skills to grow" items with natural sentences (Section 7)
 */
function generateStructuredSuggestions(missingSkills = [], jobTitle = 'this role') {
  const guidanceMap = {
    'docker': {
      priority: 'high',
      whyItMatters: 'This role expects hands-on experience containerising microservices and ensuring reproducible runtime environments.',
      nextStep: 'Build and containerise one of your existing backend services with a Dockerfile and docker-compose, then link the repository on your resume.'
    },
    'kubernetes': {
      priority: 'medium',
      whyItMatters: 'Production deployments rely on automated orchestration, scaling, and rolling updates across clusters.',
      nextStep: 'Deploy a multi-service application to a local Minikube or cloud cluster, configure ingress and services, and document it in your projects.'
    },
    'aws': {
      priority: 'high',
      whyItMatters: 'Modern cloud infrastructure requires deploying and monitoring applications on managed cloud services.',
      nextStep: 'Deploy a serverless or EC2/S3 project on AWS Free Tier, configure IAM permissions, and highlight the architecture on your resume.'
    },
    'mongodb': {
      priority: 'high',
      whyItMatters: 'Data modelling, aggregation pipelines, and indexing in document databases are foundational for scalable application backends.',
      nextStep: 'Create a full-featured CRUD application implementing complex indexing and aggregation pipelines, and document performance improvements.'
    },
    'postgresql': {
      priority: 'high',
      whyItMatters: 'Relational data integrity, schema migrations, and SQL query tuning are essential backend competencies.',
      nextStep: 'Design a normalized relational schema with foreign key constraints, indexing, and migration scripts in a production-style repo.'
    },
    'typescript': {
      priority: 'high',
      whyItMatters: 'Strong static typing reduces production runtime bugs and improves maintainability across large codebases.',
      nextStep: 'Convert an existing JavaScript project to TypeScript with strict mode enabled and clean interface definitions.'
    },
    'react': {
      priority: 'high',
      whyItMatters: 'Creating dynamic, performant user interfaces with component-driven architecture is critical for modern frontend development.',
      nextStep: 'Build a responsive web application leveraging custom hooks, accessible UI components, and state management.'
    },
    'rest apis': {
      priority: 'high',
      whyItMatters: 'Clean, predictable API contracts with standard HTTP status codes and validation are required for distributed services.',
      nextStep: 'Design and document an OpenAPI/Swagger-compliant REST API with thorough error handling and request validation.'
    }
  };

  return missingSkills.slice(0, 7).map(skill => {
    const canon = canonical(skill);
    const template = guidanceMap[canon];
    if (template) {
      return {
        skill,
        priority: template.priority,
        whyItMatters: `${skill} is missing from your resume. ${template.whyItMatters}`,
        nextStep: template.nextStep,
        sentence: `${skill} is missing from your resume, and ${jobTitle} expects this competency. ${template.whyItMatters} ${template.nextStep}`
      };
    }
    return {
      skill,
      priority: 'medium',
      whyItMatters: `${skill} is listed as a key requirement for ${jobTitle} and gives your profile stronger alignment.`,
      nextStep: `Build a practical feature or standalone project utilizing ${skill}, measure the outcome, and add measurable evidence to your resume.`,
      sentence: `${skill} is missing from your resume, and ${jobTitle} requires it. Build a practical project utilizing ${skill} and add measurable evidence to your resume.`
    };
  });
}

function skillGap(required = [], actual = [], jobTitle = 'this role') {
  const actualSet = new Set((actual || []).map(canonical));
  const matched = [];
  const missing = [];

  for (const req of required || []) {
    const res = matchSkill(req, actualSet);
    if (res.matched) {
      matched.push(req);
    } else {
      missing.push(req);
    }
  }

  const structuredSuggestions = generateStructuredSuggestions(missing, jobTitle);

  return {
    matched,
    missing,
    suggestions: structuredSuggestions
  };
}

module.exports = {
  canonical,
  matchSkill,
  isSkillEvidenced,
  extractSubSkills,
  generateStructuredSuggestions,
  skillGap
};
