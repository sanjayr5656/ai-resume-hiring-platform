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
    'github action': 'ci/cd',
    'github actions': 'ci/cd',
    'redux toolkit': 'redux',
    'tailwind': 'tailwindcss',
    'tailwind css': 'tailwindcss',
    'next': 'next.js',
    'nextjs': 'next.js',
    'next.js': 'next.js',
    'spring': 'spring boot',
    'springboot': 'spring boot',
    'dsa': 'data structures and algorithms',
    'data structures & algorithms': 'data structures and algorithms',
    'data structures algorithms': 'data structures and algorithms',
    'data structures & algorithms (dsa)': 'data structures and algorithms',
    'data structures and algorithms (dsa)': 'data structures and algorithms',
    'oop': 'object oriented programming',
    'oops': 'object oriented programming',
    'ai': 'artificial intelligence',
    'ml': 'machine learning',
    'unit testing': 'testing',
    'jest': 'testing',
    'vitest': 'testing'
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
  'mysql': ['sql', 'postgresql', 'sqlite', 'database'],
  'sqlite': ['sql', 'mysql', 'postgresql', 'database'],
  'rest apis': ['graphql', 'node.js', 'express', 'fastapi'],
  'docker': ['kubernetes', 'containers', 'devops', 'aws', 'ci/cd'],
  'kubernetes': ['docker', 'devops', 'cloud', 'aws'],
  'aws': ['cloud', 'gcp', 'azure', 'devops', 'docker'],
  'typescript': ['javascript', 'react', 'node.js'],
  'javascript': ['typescript', 'react', 'node.js', 'html', 'css'],
  'python': ['django', 'fastapi', 'flask', 'data science', 'ai', 'machine learning'],
  'java': ['spring', 'spring boot', 'oop', 'backend'],
  'spring boot': ['java', 'spring', 'oop', 'backend', 'microservices'],
  'fastapi': ['python', 'rest apis', 'pydantic', 'backend'],
  'next.js': ['react', 'typescript', 'javascript', 'frontend'],
  'tailwindcss': ['css', 'frontend', 'html'],
  'data structures and algorithms': ['dsa', 'problem solving', 'algorithms', 'computer science']
};

const prettySkillMap = {
  'typescript': 'TypeScript',
  'javascript': 'JavaScript',
  'react': 'React',
  'next.js': 'Next.js',
  'node.js': 'Node.js',
  'express': 'Express',
  'mongodb': 'MongoDB',
  'postgresql': 'PostgreSQL',
  'mysql': 'MySQL',
  'sqlite': 'SQLite',
  'fastapi': 'FastAPI',
  'flask': 'Flask',
  'django': 'Django',
  'spring boot': 'Spring Boot',
  'java': 'Java',
  'python': 'Python',
  'docker': 'Docker',
  'kubernetes': 'Kubernetes',
  'aws': 'AWS',
  'google cloud': 'Google Cloud (GCP)',
  'azure': 'Microsoft Azure',
  'git': 'Git',
  'github': 'GitHub',
  'ci/cd': 'CI/CD & GitHub Actions',
  'data structures and algorithms': 'Data Structures & Algorithms',
  'object oriented programming': 'OOP (Object-Oriented Programming)',
  'tailwindcss': 'Tailwind CSS',
  'rest apis': 'REST APIs',
  'graphql': 'GraphQL',
  'redis': 'Redis',
  'html': 'HTML5',
  'css': 'CSS3',
  'redux': 'Redux Toolkit',
  'testing': 'Testing & Quality Assurance',
  'microservices': 'Microservices Architecture',
  'system design': 'System Design'
};

const NON_SKILL_WORDS = /^(b\.?tech|b\.?e\.?|m\.?tech|m\.?s\.?|bachelor|master|degree|phd|education|in computer science|pursuing|tools|workflow|principles|knowledge|experience|proficiency|strong|hands-on|coursework|technical stack|related technical field|engineering|such as|solid|frameworks|database knowledge)$/i;

function prettifySkill(cSkill) {
  const c = canonical(cSkill);
  if (prettySkillMap[c]) return prettySkillMap[c];
  // Convert kebab-case or space-separated to Title Case
  return String(cSkill)
    .replace(/(?:^|\s|-)\S/g, char => char.toUpperCase())
    .trim();
}

/**
 * Break compound requirement phrases into candidate sub-skills
 * (Handles recruiters pasting entire paragraphs or multi-skill sentences)
 */
function extractSubSkills(phrase) {
  if (!phrase) return [];
  const rawParts = String(phrase)
    .split(/[,;:•/()&+\n\r]+|\bor\b|\band\b/i)
    .map(p => p.trim())
    .filter(p => p.length >= 2 && p.length <= 45);

  const cleaned = [];
  for (const part of rawParts) {
    const canon = canonical(part);
    if (canon && !NON_SKILL_WORDS.test(canon)) {
      cleaned.push(canon);
    }
  }
  return cleaned;
}

/**
 * Clean and extract genuine, discrete technical skills from raw recruiter input
 * Removes sentence fragments and boilerplate text
 */
function extractCleanSkills(rawSkills = []) {
  if (!Array.isArray(rawSkills)) {
    rawSkills = typeof rawSkills === 'string' ? [rawSkills] : [];
  }

  const recognizedPatterns = [
    { name: 'TypeScript', regex: /\b(typescript|ts)\b/i },
    { name: 'JavaScript', regex: /\b(javascript|js)\b/i },
    { name: 'React', regex: /\b(react|reactjs|react\.js)\b/i },
    { name: 'Next.js', regex: /\b(next\.js|nextjs|next)\b/i },
    { name: 'Node.js', regex: /\b(node\.js|nodejs|node)\b/i },
    { name: 'Express', regex: /\b(express|expressjs|express\.js)\b/i },
    { name: 'Python', regex: /\bpython\b/i },
    { name: 'FastAPI', regex: /\bfastapi\b/i },
    { name: 'Flask', regex: /\bflask\b/i },
    { name: 'Django', regex: /\bdjango\b/i },
    { name: 'Java', regex: /\bjava\b/i },
    { name: 'Spring Boot', regex: /\b(spring boot|springboot|spring)\b/i },
    { name: 'MongoDB', regex: /\b(mongodb|mongo)\b/i },
    { name: 'MySQL', regex: /\bmysql\b/i },
    { name: 'PostgreSQL', regex: /\b(postgresql|postgres|psql)\b/i },
    { name: 'SQLite', regex: /\bsqlite\b/i },
    { name: 'SQL', regex: /\bsql\b/i },
    { name: 'Git', regex: /\bgit\b/i },
    { name: 'GitHub', regex: /\bgithub\b/i },
    { name: 'Docker', regex: /\bdocker\b/i },
    { name: 'Kubernetes', regex: /\b(kubernetes|k8s)\b/i },
    { name: 'AWS', regex: /\b(aws|amazon web services)\b/i },
    { name: 'REST APIs', regex: /\b(rest|rest api|rest apis|restful)\b/i },
    { name: 'GraphQL', regex: /\bgraphql\b/i },
    { name: 'Redis', regex: /\bredis\b/i },
    { name: 'Tailwind CSS', regex: /\b(tailwind|tailwindcss)\b/i },
    { name: 'Data Structures & Algorithms', regex: /\b(data structures|algorithms|dsa)\b/i },
    { name: 'OOP', regex: /\b(object-oriented|oop|oops)\b/i },
    { name: 'CI/CD', regex: /\b(ci\/cd|cicd|github actions)\b/i },
    { name: 'HTML5', regex: /\bhtml(5)?\b/i },
    { name: 'CSS3', regex: /\bcss(3)?\b/i },
    { name: 'Microservices', regex: /\bmicroservices?\b/i },
    { name: 'System Design', regex: /\bsystem design\b/i },
    { name: 'Testing', regex: /\b(testing|jest|cypress|vitest|unit test)\b/i }
  ];

  const discreteSet = new Set();
  const seenCanonical = new Set();

  for (const raw of rawSkills) {
    if (!raw) continue;
    const str = String(raw).trim();
    if (!str) continue;

    // Check if it's already a clean, concise single skill
    const canon = canonical(str);
    const isSentence = str.length > 30 || /[,;:•\n\r]|\band\b|\bor\b/i.test(str) || /^(education|technical stack|tools|database knowledge|hands-on|core)/i.test(str);

    if (!isSentence && canon.length >= 2 && canon.length <= 25 && !NON_SKILL_WORDS.test(canon)) {
      if (!seenCanonical.has(canon)) {
        seenCanonical.add(canon);
        discreteSet.add(prettifySkill(str));
      }
      continue;
    }

    // It's a compound or narrative string; extract recognized skills
    let matchedAny = false;
    for (const pat of recognizedPatterns) {
      if (pat.regex.test(str)) {
        const cPat = canonical(pat.name);
        if (!seenCanonical.has(cPat)) {
          seenCanonical.add(cPat);
          discreteSet.add(pat.name);
          matchedAny = true;
        }
      }
    }

    // Fallback: If no recognized skill matched, try subskill splitting if parts look reasonable
    if (!matchedAny) {
      const subs = extractSubSkills(str);
      for (const s of subs) {
        if (s.length >= 2 && s.length <= 25 && !NON_SKILL_WORDS.test(s) && !seenCanonical.has(s)) {
          seenCanonical.add(s);
          discreteSet.add(prettifySkill(s));
        }
      }
    }
  }

  return Array.from(discreteSet);
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
  if (!cSkill) return false;
  const regex = new RegExp(`(^|[^a-z0-9])${cSkill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i');

  for (const p of projects || []) {
    const techList = Array.isArray(p.technologies) ? p.technologies.map(canonical) : [];
    if (techList.includes(cSkill)) return true;
    const text = `${p.name || ''} ${p.description || ''}`;
    if (regex.test(text.toLowerCase())) return true;
  }

  for (const e of experience || []) {
    const text = `${e.title || ''} ${e.description || ''}`;
    if (regex.test(text.toLowerCase())) return true;
  }

  return false;
}

/**
 * High-value tech guidance dictionary with architectural rationale, next steps,
 * portfolio project ideas, learning resources, and resume impact.
 */
const guidanceCatalog = {
  'typescript': {
    category: 'Programming Language & Type Safety',
    priority: 'high',
    whyItMatters: 'Enterprise engineering teams and modern full-stack codebases mandate TypeScript to eliminate runtime null/undefined errors, enforce strict API contracts, and enable scalable refactoring across distributed services.',
    nextStep: 'Refactor one of your existing JavaScript repositories to TypeScript with strict mode enabled. Define strict interfaces for request payloads, response schemas, and database models.',
    projectIdea: 'Build a strongly-typed full-stack CRUD application with shared TypeScript contracts between backend endpoints and frontend client, validated at runtime with Zod.',
    resources: [
      { title: 'Official TypeScript Handbook', url: 'https://www.typescriptlang.org/docs/' },
      { title: 'Total TypeScript Essentials', url: 'https://www.totaltypescript.com/' }
    ],
    estimatedTime: '1 to 2 weeks',
    scoreImpact: '+15% match rate',
    difficulty: 'Intermediate',
    evidenceTip: 'List TypeScript under Primary Languages on your resume and specify: "Enforced compile-time type safety with zero any types across all client-server boundary models."'
  },
  'next.js': {
    category: 'Frontend Architecture & SSR',
    priority: 'high',
    whyItMatters: 'Next.js is the premier React framework for production web applications, offering Server Components, automated code-splitting, fast static site generation (SSG), and dynamic server rendering (SSR) for optimal performance and SEO.',
    nextStep: 'Build a multi-page web application using Next.js 14/15 App Router, Server Actions, parallel routes, and dynamic metadata, deployed on Vercel with automated CI preview environments.',
    projectIdea: 'Develop a full-stack SaaS dashboard with Server-Side Rendering (SSR), optimistic UI mutations, and role-based authentication middleware.',
    resources: [
      { title: 'Next.js Official Learn Course', url: 'https://nextjs.org/learn' },
      { title: 'Next.js App Router Documentation', url: 'https://nextjs.org/docs' }
    ],
    estimatedTime: '1 to 2 weeks',
    scoreImpact: '+15% match rate',
    difficulty: 'Intermediate',
    evidenceTip: 'Highlight Next.js App Router, Server Actions, and a live Vercel deployment link in your portfolio project bullets.'
  },
  'tailwindcss': {
    category: 'Frontend & UI Engineering',
    priority: 'medium',
    whyItMatters: 'Tailwind CSS accelerates frontend development with utility-first responsive styling and consistent design systems without bulky stylesheet overhead or naming collision issues.',
    nextStep: 'Design a responsive web interface using Tailwind CSS with dark mode support, custom design tokens, and accessible interactive primitives (e.g., Radix UI or Headless UI).',
    projectIdea: 'Create an analytics UI featuring responsive layout grids, dark/light theme switching, and smooth micro-animations.',
    resources: [
      { title: 'Tailwind CSS Documentation', url: 'https://tailwindcss.com/docs' }
    ],
    estimatedTime: '3 to 5 days',
    scoreImpact: '+10% match rate',
    difficulty: 'Beginner',
    evidenceTip: 'Showcase responsive mobile UI and dark mode styling in your live project demonstrations.'
  },
  'docker': {
    category: 'DevOps & Containerization',
    priority: 'high',
    whyItMatters: 'Containerization guarantees reproducible runtime environments across local development machines, CI/CD runners, and production cloud clusters, preventing "it works on my machine" issues.',
    nextStep: 'Write multi-stage Dockerfiles for your frontend and backend services. Use docker-compose to orchestrate the application, database, and caching layers with healthchecks.',
    projectIdea: 'Create a multi-container local development setup (Node API + MongoDB/PostgreSQL + Redis) orchestrated via docker-compose with automated volume persistence.',
    resources: [
      { title: 'Docker Getting Started Guide', url: 'https://docs.docker.com/get-started/' },
      { title: 'Docker for Web Developers Tutorial', url: 'https://docker-curriculum.com/' }
    ],
    estimatedTime: '1 week',
    scoreImpact: '+12% match rate',
    difficulty: 'Intermediate',
    evidenceTip: 'Mention Docker and docker-compose in your project tech stack and include clean Dockerfile scripts in your GitHub repositories.'
  },
  'kubernetes': {
    category: 'Cloud & Container Orchestration',
    priority: 'medium',
    whyItMatters: 'Production cloud infrastructures rely on Kubernetes to orchestrate multi-container microservices, manage horizontal pod autoscaling, and execute zero-downtime rolling deployments.',
    nextStep: 'Deploy a multi-service application to a local Minikube cluster with Deployments, ClusterIP/NodePort Services, ConfigMaps, and Ingress routing rules.',
    projectIdea: 'Deploy a microservices application on Minikube with horizontal pod autoscaling (HPA) and resource limit quotas.',
    resources: [
      { title: 'Kubernetes Official Interactive Tutorials', url: 'https://kubernetes.io/docs/tutorials/' }
    ],
    estimatedTime: '2 to 3 weeks',
    scoreImpact: '+15% match rate',
    difficulty: 'Advanced',
    evidenceTip: 'Note Minikube deployment and Kubernetes YAML manifest configurations in your GitHub repositories.'
  },
  'aws': {
    category: 'Cloud Infrastructure & Managed Services',
    priority: 'high',
    whyItMatters: 'Deploying, provisioning, and securing applications in the cloud using managed services (S3, EC2, Lambda, IAM) is a vital competency for full-stack and backend developers.',
    nextStep: 'Deploy a serverless backend or containerized service on AWS Free Tier, configure automated HTTPS via CloudFront/Route53, and set up least-privilege IAM security policies.',
    projectIdea: 'Build a secure media storage service using AWS S3 pre-signed upload URLs and an AWS Lambda asynchronous thumbnail processor.',
    resources: [
      { title: 'AWS Free Tier Hands-On Labs', url: 'https://aws.amazon.com/free/' }
    ],
    estimatedTime: '2 weeks',
    scoreImpact: '+15% match rate',
    difficulty: 'Intermediate',
    evidenceTip: 'Specify exact AWS services used (e.g. S3, EC2, Lambda, CloudFront) alongside live cloud deployment URLs.'
  },
  'postgresql': {
    category: 'Database & Relational Modeling',
    priority: 'high',
    whyItMatters: 'Relational data integrity, schema migrations, normalized foreign-key constraints, and SQL query indexing are essential for reliable enterprise transactional data.',
    nextStep: 'Design a normalized 3NF relational schema with migration scripts (e.g., Prisma, Knex, or raw SQL), implement join queries, and add compound indexes to optimize query execution plans.',
    projectIdea: 'An e-commerce order management system with ACID transactions, inventory locking, and complex sales aggregation reporting.',
    resources: [
      { title: 'PostgreSQL Tutorial', url: 'https://www.postgresqltutorial.com/' }
    ],
    estimatedTime: '1 to 2 weeks',
    scoreImpact: '+12% match rate',
    difficulty: 'Intermediate',
    evidenceTip: 'Include schema design and query optimization achievements in your resume project descriptions.'
  },
  'mongodb': {
    category: 'Database & NoSQL Architecture',
    priority: 'high',
    whyItMatters: 'Data modelling, aggregation pipelines, and indexing in document databases are foundational for scalable, flexible web application backends.',
    nextStep: 'Create a full-featured CRUD application implementing complex indexing and aggregation pipelines, and document performance improvements.',
    projectIdea: 'A high-throughput analytics logging service utilizing MongoDB aggregation frameworks and compound index optimizations.',
    resources: [
      { title: 'MongoDB University Free Courses', url: 'https://learn.mongodb.com/' }
    ],
    estimatedTime: '1 week',
    scoreImpact: '+12% match rate',
    difficulty: 'Beginner',
    evidenceTip: 'Mention complex aggregation pipelines, schema validation, and indexing strategies.'
  },
  'mysql': {
    category: 'Database & Relational Systems',
    priority: 'high',
    whyItMatters: 'MySQL is one of the most widely deployed relational database engines in the world, critical for transaction consistency, normalized data architectures, and relational queries.',
    nextStep: 'Write optimized SQL queries utilizing JOINs, indexes, and transactions. Integrate MySQL with your backend ORM or query builder.',
    projectIdea: 'A multi-table reservation or inventory system handling concurrent transactions and foreign key constraints.',
    resources: [
      { title: 'MySQL Documentation & Tutorials', url: 'https://dev.mysql.com/doc/' }
    ],
    estimatedTime: '1 to 2 weeks',
    scoreImpact: '+10% match rate',
    difficulty: 'Intermediate',
    evidenceTip: 'Highlight relational database design, query optimization, and transaction handling.'
  },
  'spring boot': {
    category: 'Backend Architecture & Microservices',
    priority: 'high',
    whyItMatters: 'Spring Boot is the premier enterprise framework for Java backends, providing dependency injection, robust Spring Data JPA persistence, and industry-standard Spring Security.',
    nextStep: 'Build a production-grade REST API utilizing Spring Boot 3, Spring Data JPA with MySQL/PostgreSQL, Spring Security with JWT tokens, and automated integration tests.',
    projectIdea: 'A role-based access control (RBAC) microservice with rate limiting, Swagger OpenAPI documentation, and PostgreSQL backend.',
    resources: [
      { title: 'Spring Boot Official Guides', url: 'https://spring.io/guides' }
    ],
    estimatedTime: '2 to 3 weeks',
    scoreImpact: '+18% match rate',
    difficulty: 'Intermediate',
    evidenceTip: 'Highlight Spring Data JPA, Spring Security, and Maven/Gradle configuration on your resume.'
  },
  'fastapi': {
    category: 'Backend Architecture & Python Services',
    priority: 'medium',
    whyItMatters: 'FastAPI combines asynchronous IO performance with Pydantic type validation and automatic OpenAPI documentation, making it the premier choice for Python APIs and AI services.',
    nextStep: 'Build an asynchronous Python REST API using FastAPI, Pydantic v2 data models, and SQLAlchemy 2.0 with asyncpg.',
    projectIdea: 'An AI-powered document extraction microservice connecting FastAPI with background worker queues.',
    resources: [
      { title: 'FastAPI Official Documentation', url: 'https://fastapi.tiangolo.com/' }
    ],
    estimatedTime: '1 to 2 weeks',
    scoreImpact: '+12% match rate',
    difficulty: 'Intermediate',
    evidenceTip: 'Note asynchronous IO, Pydantic data schemas, and interactive Swagger documentation.'
  },
  'flask': {
    category: 'Backend Architecture & Python Services',
    priority: 'medium',
    whyItMatters: 'Flask is a modular, lightweight Python framework widely used for microservices, lightweight REST endpoints, and rapid backend service development.',
    nextStep: 'Build a modular Python REST API using Flask Blueprints, SQLAlchemy ORM with SQLite or PostgreSQL, and Marshmallow/Pydantic validation schemas.',
    projectIdea: 'A lightweight webhook processing and notification dispatch microservice with token authentication.',
    resources: [
      { title: 'Flask Official Documentation', url: 'https://flask.palletsprojects.com/' }
    ],
    estimatedTime: '1 week',
    scoreImpact: '+10% match rate',
    difficulty: 'Beginner',
    evidenceTip: 'Highlight Flask Blueprints, SQLAlchemy data models, and RESTful route architecture.'
  },
  'redis': {
    category: 'Performance & In-Memory Caching',
    priority: 'medium',
    whyItMatters: 'High-traffic applications rely on in-memory key-value stores to reduce database load, manage distributed session state, and maintain sub-50ms API response times.',
    nextStep: 'Integrate Redis into your backend to cache frequent read-heavy API responses with TTL expiration, and implement a distributed rate-limiter middleware.',
    projectIdea: 'An API rate limiter and real-time session cache that decreases database round-trips by 70% under simulated load.',
    resources: [
      { title: 'Redis University & Docs', url: 'https://redis.io/learn/' }
    ],
    estimatedTime: '3 to 5 days',
    scoreImpact: '+10% match rate',
    difficulty: 'Intermediate',
    evidenceTip: 'Quantify latency improvement: "Reduced database load by 60% by implementing a Redis cache layer for high-throughput endpoints."'
  },
  'data structures and algorithms': {
    category: 'Core Computer Science & Problem Solving',
    priority: 'high',
    whyItMatters: 'Technical interview rounds for top engineering teams evaluate fundamental algorithmic problem solving, time/space complexity tradeoffs, and optimal data structure choices.',
    nextStep: 'Practice the NeetCode/LeetCode 75 problem set, focusing on Arrays, HashMaps, Two Pointers, Trees, and Graph traversals (BFS/DFS). Focus on explaining Big-O time and space complexity clearly.',
    projectIdea: 'Implement custom data structures (Trie for autocomplete or LRU Cache) and benchmark their operations.',
    resources: [
      { title: 'NeetCode 150 Roadmap', url: 'https://neetcode.io/' },
      { title: 'GeeksforGeeks DSA Mastery', url: 'https://www.geeksforgeeks.org/learn-data-structures-and-algorithms-dsa-tutorial/' }
    ],
    estimatedTime: '2 to 4 weeks',
    scoreImpact: '+20% interview readiness',
    difficulty: 'Advanced',
    evidenceTip: 'Mention coursework or problem-solving milestones: "Solved 100+ LeetCode DSA challenges focusing on efficient search, trees, and graph algorithms."'
  },
  'object oriented programming': {
    category: 'Software Design & Clean Architecture',
    priority: 'medium',
    whyItMatters: 'OOP and SOLID design principles ensure codebases are modular, extensible, testable, and maintainable as project complexity grows.',
    nextStep: 'Apply SOLID principles, design patterns (Factory, Strategy, Observer), and dependency injection in your backend project architectures.',
    projectIdea: 'Refactor an existing monolithic service into modular classes with abstract interfaces and dependency injection.',
    resources: [
      { title: 'Refactoring Guru: Design Patterns', url: 'https://refactoring.guru/design-patterns' }
    ],
    estimatedTime: '1 week',
    scoreImpact: '+10% match rate',
    difficulty: 'Intermediate',
    evidenceTip: 'Reference SOLID principles and modular service architecture in project descriptions.'
  },
  'ci/cd': {
    category: 'DevOps & Automation',
    priority: 'medium',
    whyItMatters: 'Continuous Integration and Deployment pipelines automate linting, unit testing, Docker container builds, and cloud deployments on every pull request.',
    nextStep: 'Create a `.github/workflows/ci.yml` pipeline that triggers on pull requests to run linters, execute unit tests, build Docker containers, and deploy to staging.',
    projectIdea: 'A zero-downtime GitHub Actions workflow deploying to cloud hosting with status badges on your repo README.',
    resources: [
      { title: 'GitHub Actions Documentation', url: 'https://docs.github.com/en/actions' }
    ],
    estimatedTime: '3 to 5 days',
    scoreImpact: '+10% match rate',
    difficulty: 'Intermediate',
    evidenceTip: 'Include a passing CI/CD build badge on your project GitHub README.'
  },
  'graphql': {
    category: 'API Architecture & Data Fetching',
    priority: 'medium',
    whyItMatters: 'GraphQL enables frontends to query precisely the data required in a single round-trip, eliminating over-fetching and under-fetching across complex entity graphs.',
    nextStep: 'Build an Apollo Server or GraphQL Yoga endpoint with schemas, resolvers, and DataLoader batching to prevent N+1 query problems.',
    projectIdea: 'A multi-entity dashboard API with nested resolvers and real-time GraphQL Subscriptions.',
    resources: [
      { title: 'Official GraphQL Learn Course', url: 'https://graphql.org/learn/' }
    ],
    estimatedTime: '1 to 2 weeks',
    scoreImpact: '+10% match rate',
    difficulty: 'Intermediate',
    evidenceTip: 'Mention DataLoader N+1 query prevention and schema design on your resume.'
  },
  'testing': {
    category: 'Quality Assurance & Reliability',
    priority: 'medium',
    whyItMatters: 'Automated unit, integration, and end-to-end tests provide confidence to deploy code rapidly without breaking existing features.',
    nextStep: 'Set up automated unit tests for your core business logic using Jest/Vitest, and write critical-path integration tests for your REST endpoints with Supertest.',
    projectIdea: 'Achieve >80% test coverage on a core checkout or authentication workflow with automated CI test execution.',
    resources: [
      { title: 'Testing JavaScript by Kent C. Dodds', url: 'https://testingjavascript.com/' }
    ],
    estimatedTime: '1 week',
    scoreImpact: '+12% match rate',
    difficulty: 'Intermediate',
    evidenceTip: 'Highlight: "Configured automated test suite with Jest/Supertest achieving 85% branch coverage in CI pipeline."'
  },
  'rest apis': {
    category: 'API Engineering & Architecture',
    priority: 'high',
    whyItMatters: 'Clean, predictable API contracts with standard HTTP status codes, structured error payloads, and validation are required for distributed services.',
    nextStep: 'Design and document an OpenAPI/Swagger-compliant REST API with thorough error handling, pagination, and request validation.',
    projectIdea: 'A robust public REST API with rate limiting, Swagger documentation, and semantic versioning.',
    resources: [
      { title: 'RESTful API Best Practices', url: 'https://restfulapi.net/' }
    ],
    estimatedTime: '1 week',
    scoreImpact: '+10% match rate',
    difficulty: 'Beginner',
    evidenceTip: 'Highlight OpenAPI/Swagger documentation and standard status code conventions.'
  }
};

/**
 * Generate structured, personalized "skills to grow" items with natural sentences
 * Synthesizes actionable advice from candidate's extracted resume data and job requirements
 */
function generateStructuredSuggestions(missingSkills = [], jobTitle = 'this role', candidateProfile = {}) {
  // Extract candidate's existing strengths from extracted resume profile
  const candidateSkills = Array.isArray(candidateProfile.skills) ? candidateProfile.skills : [];
  const candidateSkillsText = candidateSkills.slice(0, 4).join(', ');
  const hasReact = candidateSkills.some(s => /react/i.test(s));
  const hasNode = candidateSkills.some(s => /node/i.test(s));
  const hasPython = candidateSkills.some(s => /python/i.test(s));
  const hasJava = candidateSkills.some(s => /java/i.test(s));

  // Clean and filter missing skills
  const cleanMissing = extractCleanSkills(missingSkills);

  // If missing skills are few, intelligently recommend complementary growth skills
  const recommendationsSet = new Set(cleanMissing.map(canonical));
  const curatedList = [...cleanMissing];

  if (curatedList.length < 3) {
    const strategicAdditions = [];
    if (hasReact && !recommendationsSet.has('typescript')) strategicAdditions.push('TypeScript');
    if (hasReact && !recommendationsSet.has('next.js')) strategicAdditions.push('Next.js');
    if ((hasNode || hasPython || hasJava) && !recommendationsSet.has('docker')) strategicAdditions.push('Docker');
    if (!recommendationsSet.has('data structures and algorithms')) strategicAdditions.push('Data Structures & Algorithms');

    for (const addition of strategicAdditions) {
      if (curatedList.length >= 5) break;
      const canon = canonical(addition);
      if (!recommendationsSet.has(canon)) {
        recommendationsSet.add(canon);
        curatedList.push(addition);
      }
    }
  }

  // Cap at 6 high-impact skills to prevent cognitive overload
  const topSkills = curatedList.slice(0, 6);

  return topSkills.map(skill => {
    const canon = canonical(skill);
    const prettyName = prettifySkill(skill);
    const template = guidanceCatalog[canon];

    // Personalize current baseline based on candidate's extracted resume profile
    let currentStatus = '';
    if (candidateSkillsText) {
      currentStatus = `Based on your resume, you have proven experience in ${candidateSkillsText}. Growing ${prettyName} will directly elevate your profile for ${jobTitle}.`;
    } else {
      currentStatus = `Adding ${prettyName} will strengthen your evidence for ${jobTitle} and modern industry engineering standards.`;
    }

    if (template) {
      return {
        skill: prettyName,
        category: template.category,
        priority: template.priority,
        currentStatus,
        whyItMatters: template.whyItMatters,
        nextStep: template.nextStep,
        projectIdea: template.projectIdea,
        resources: template.resources || [],
        estimatedTime: template.estimatedTime,
        scoreImpact: template.scoreImpact,
        difficulty: template.difficulty,
        evidenceTip: template.evidenceTip,
        sentence: `${prettyName} is missing from your resume, and ${jobTitle} expects this competency. ${template.whyItMatters} ${template.nextStep}`
      };
    }

    // Heuristic synthesizer for novel / uncataloged skills
    const isHighPriority = /cloud|security|lead|senior|architect/i.test(jobTitle);
    const inferredCategory = /css|ui|frontend|design/i.test(skill) ? 'Frontend Engineering'
      : /database|sql|data|storage/i.test(skill) ? 'Data & Persistence'
      : /devops|cloud|infra|deploy|docker|k8s/i.test(skill) ? 'Cloud & DevOps'
      : 'Engineering Competency';

    return {
      skill: prettyName,
      category: inferredCategory,
      priority: isHighPriority ? 'high' : 'medium',
      currentStatus,
      whyItMatters: `${prettyName} is a recognized requirement for ${jobTitle} and gives your profile stronger technical alignment and competitive advantage.`,
      nextStep: `Build a practical feature or standalone module utilizing ${prettyName}, measure performance improvements, and link the public repository on your resume.`,
      projectIdea: `Create an end-to-end prototype integrating ${prettyName} into your existing application workflow with documented setup steps.`,
      resources: [
        { title: `${prettyName} Documentation`, url: `https://www.google.com/search?q=${encodeURIComponent(prettyName + ' documentation tutorial')}` }
      ],
      estimatedTime: '1 to 2 weeks',
      scoreImpact: '+10% match rate',
      difficulty: 'Intermediate',
      evidenceTip: `Add ${prettyName} to your resume technical skills and describe a specific feature implemented using it in your projects section.`,
      sentence: `${prettyName} is missing from your resume, and ${jobTitle} requires it. Build a practical project utilizing ${prettyName} and add measurable evidence to your resume.`
    };
  });
}

/**
 * Compare required skills against candidate actual skills / parsed profile
 * Returns sanitized matched, missing, and structured suggestions
 */
function skillGap(required = [], actualOrProfile = [], jobTitle = 'this role') {
  // Support both actual skills array and full parsed profile
  let actualSkills = [];
  let candidateProfile = {};

  if (Array.isArray(actualOrProfile)) {
    actualSkills = actualOrProfile;
    candidateProfile = { skills: actualOrProfile };
  } else if (actualOrProfile && typeof actualOrProfile === 'object') {
    candidateProfile = actualOrProfile;
    actualSkills = Array.isArray(actualOrProfile.skills) ? actualOrProfile.skills : [];
  }

  // Clean and normalize required skills into discrete technical competencies
  const cleanRequired = extractCleanSkills(required);

  const actualSet = new Set(actualSkills.map(canonical));
  const matched = [];
  const missing = [];

  for (const req of cleanRequired) {
    const res = matchSkill(req, actualSet);
    if (res.matched) {
      matched.push(req);
    } else {
      // Also check if evidenced in candidate projects even if missing in skills list
      const isEvidenced = isSkillEvidenced(req, candidateProfile.projects, candidateProfile.experience);
      if (isEvidenced) {
        matched.push(req);
      } else {
        missing.push(req);
      }
    }
  }

  const structuredSuggestions = generateStructuredSuggestions(missing, jobTitle, candidateProfile);

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
  extractCleanSkills,
  prettifySkill,
  guidanceCatalog,
  generateStructuredSuggestions,
  skillGap
};
