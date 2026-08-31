export type Section = {
  heading: string;
  body?: string[];
  items?: string[];
};

export type SitePage = {
  slug: string;
  eyebrow: string;
  title: string;
  intro: string;
  image: string;
  sections: Section[];
};

export const pages: SitePage[] = [
  {
    slug: 'about',
    eyebrow: 'The Everglades Foundation™',
    title: 'Mission & Vision',
    intro: 'The Everglades Foundation is a 501(c)(3) non-profit dedicated to leading efforts to restore and protect the greater Everglades ecosystem.',
    image: '/images/everglades-01.jpg',
    sections: [
      { heading: 'The Everglades Foundation', body: ['Since its founding in 1993 by a group of local outdoor enthusiasts, the Foundation has become a respected and important advocate for the sustainability of one of the world’s most unique ecosystems.', 'Rooted in science and inspired by solutions, The Everglades Foundation takes a powerful democratic approach when advocating for the restoration of America’s beloved wetland.'] },
      { heading: 'Our Mission', body: ['The Everglades Foundation works to protect and restore America’s Everglades through science, advocacy, and education.', 'We envision an Everglades with abundant freshwater for consumption, enjoyment, ecological health and economic growth for generations to come.'] },
      { heading: 'Everglades Education', body: ['The Everglades Literacy Program empowers the next generation of conservation stewards by investing in teachers to drive cultural change within schools for the benefit of local and ecological communities.'], items: ['STEM-based professional development and teacher trainings', 'Free lessons and materials for participating teachers', 'A free, online PreK-12 Teacher Toolkit', 'The PreK-12 Everglades Champion Schools Program'] },
      { heading: 'Meet the Team', items: ['Jennifer Diaz — Vice President of Education', 'Bianca Cassouto — Director of Education', 'Alicia Torres — K-12 Champion Schools Program Manager', 'Tate Penny — Everglades Literacy Program Coordinator, SWFL', 'Alyssa Saldarriaga — Everglades Literacy Program Coordinator, Treasure Coast', 'Tessa Whalen — Everglades Literacy Program Coordinator, South Florida', 'Jeannette Rubio — Senior Administrative Assistant', 'Susan Toth — Environmental Education Specialist'] },
    ],
  },
  {
    slug: 'teacher-toolkit',
    eyebrow: 'Standards-aligned PreK–12 curriculum',
    title: 'Teacher Toolkit™',
    intro: 'A free, online PreK-12 Teacher Toolkit with comprehensive Everglades lesson plans aligned to the State Academic Standards.',
    image: '/images/everglades-30.png',
    sections: [
      { heading: 'Welcome to the Everglades Literacy Teacher Toolkit', body: ['This statewide program provides the skills and tools necessary to act to protect this threatened ecosystem, which provides the daily water supply for 9 million Floridians, contributes billions of dollars to Florida’s economy, and provides recreational and educational opportunities for millions of visitors.'] },
      { heading: 'PreK-12 Curriculum', items: ['PreK–2nd Grade', '3rd–5th Grade', '6th–8th Grade', '9th–12th Grade', 'Water Use and Society', 'Water Quality Testing', 'Threats to the Everglades'] },
      { heading: 'Lesson Plan Breakdown', body: ['The PreK-12 Lesson Plan Breakdown shows our comprehensive Everglades lesson plan alignment to the State Academic Standards and Fundamental Concepts.'] },
      { heading: 'The Everglades…', items: ['Is unique and valuable', 'Is defined and connected by water', 'Is shaped by Florida’s geology and geography', 'Influences and is influenced by weather and climate', 'Supports a great diversity of life and ecosystems', 'Has experienced many changes over time and is endangered', 'People and the Everglades are inextricably connected'] },
    ],
  },
  {
    slug: 'instructional-resources',
    eyebrow: 'Lessons and more',
    title: 'Additional Instructional Resources',
    intro: 'Discover bite-sized, fun and engaging interdisciplinary lesson plans and adaptations for the classroom or a virtual platform.',
    image: '/images/everglades-03.jpg',
    sections: [
      { heading: 'Explore by grade', items: ['K–2: Everglades safari, poetry, birds and water', '3–5: animal classifications, habitats and conservation', '6–8: threats to the ecosystem and Everglades history', '9–12: scientific inquiry and real-world challenges', 'Science content reading comprehension', 'Media materials and dual-language resources'] },
      { heading: 'K–2nd Grade', items: ['Everglades Haiku Worksheet', 'Everglades Swamp Symphony', 'If I Had a Wish for Water Extension', 'American Alligators vs. American Crocodiles', 'Everglades Animals’ Food Sources Matching Game', 'Who Lives in the Everglades? Coloring Book'] },
      { heading: '3rd–5th Grade', items: ['Kids Discover the Everglades', 'Invasive Species in the Everglades', 'Everglades Backyard BioBlitz', 'Mangroves of the Everglades', 'Everglades, Shaped by Fire', 'Build an Airboat at Home STEM Activity', 'Coding Through the Everglades'] },
      { heading: '6th–12th Grade', items: ['Everglades Water Dilemmas', 'Changes to the Everglades Watershed', 'Historic Water Flow vs. Altered Water Flow', 'Florida’s Aquifers', 'Ecosystem Services of the Everglades', 'How Florida Droughts Affect the Everglades & Us', 'How CITES Is Helping to Conserve the Everglades'] },
    ],
  },
  {
    slug: 'champions',
    eyebrow: 'Everglades Champion Schools™',
    title: 'What is a Champion School?',
    intro: 'A call-to-action designed to empower schools to find their Everglades potential through curriculum, projects and practices that become part of school culture.',
    image: '/images/everglades-32.jpg',
    sections: [
      { heading: 'Make conservation a core value', body: ['An Everglades Champion School encourages teachers to participate in professional development, integrates Everglades Literacy into the curriculum, and promotes interdisciplinary projects, field experiences, community and culture.'] },
      { heading: 'Select your grade level', items: ['PreK–5 Champion Schools', '6–12 Champions in Action', 'Current Champion Schools'] },
    ],
  },
  {
    slug: 'k-5-champions',
    eyebrow: 'PreK–5 Everglades',
    title: 'Champion Schools™',
    intro: 'An exciting interdisciplinary program that annually showcases and recognizes Florida schools demonstrating exceptional Everglades literacy efforts.',
    image: '/images/everglades-35.jpg',
    sections: [
      { heading: 'Program benefits', items: ['Receive school district recognition', 'Increase environmental stewardship and awareness', 'Receive branded Champion Schools awards and materials', 'Enhance leadership in your school’s community'] },
      { heading: 'Our step-by-step process', items: ['Step 1 — Review the Evaluation Criteria', 'Step 2 — Complete the Program Commitment Form', 'Step 3 — Complete and document your school’s application'] },
      { heading: 'Program resources', items: ['PreK-5 Champions Leaders’ Guide', 'PreK-12 Everglades Teacher Toolkit', 'Champion School Tracking Sheet', 'Documentation Template', 'Interdisciplinary Projects', 'Field Experiences', 'Student Ambassadors', 'Challenge Coin Competition', 'Education Mini-Grants'] },
    ],
  },
  {
    slug: '6-12-champions',
    eyebrow: '6–12th Grade Everglades',
    title: 'Champions in Action™',
    intro: 'A student-centered, standards-aligned environmental civic action program that empowers young people to address Everglades issues.',
    image: '/images/everglades-36.jpg',
    sections: [
      { heading: 'Who is eligible?', body: ['Any Florida public, private, charter, or parochial school teacher serving students in grades 6–12 is eligible. Participating educators must have attended an endorsed Middle/High School Everglades Literacy Teacher Training within the last three years and implement the program with at least 10 students.'] },
      { heading: 'Program benefits', items: ['Increase environmental stewardship and awareness', 'Build youth-adult partnerships that create civic change', 'Eligible educators may receive compensation and project funding', 'Schools receive branded awards and may receive district recognition'] },
      { heading: 'How to apply', items: ['Step 1 — Review the Program Criteria', 'Step 2 — Fill out the Commitment Form', 'Step 3 — Complete the Final Reporting Form'] },
      { heading: 'Program resources', items: ['Professional Development', 'Champions in Action Educators’ Guide', 'Everglades Literacy Teacher Toolkit', 'Program Video Criteria', 'Educator Tip Cards', 'NGSSS Alignment', 'Toolkit to Topic Correlation', 'Champions in Action Project Stories'] },
    ],
  },
  {
    slug: 'getinvolved',
    eyebrow: 'Discover how to',
    title: 'Get Involved',
    intro: 'Explore free programs and resources that connect teachers, students and families with America’s Everglades.',
    image: '/images/everglades-38.jpg',
    sections: [
      { heading: 'Teacher Training', body: ['During this free training, we review the Everglades Literacy Program, explore the Teacher Toolkit, and share sample lessons and activities from the standards-aligned curriculum.', 'Trainings can be hosted in person or virtually on professional development days, weekdays and Saturdays. Attending teachers are eligible to receive printed lessons and materials.'] },
      { heading: 'Classroom Presentations', body: ['K–5 teachers can join free virtual classroom presentations about Everglades topics throughout the school year.'] },
      { heading: 'Families ForEverglades', body: ['Watch previous family night sessions, download resource packets, and discover fun and exciting Everglades activities to do at home.'] },
      { heading: 'Teacher Symposium & Challenge Coin', body: ['The annual symposium offers engaging professional development, collaboration and content knowledge. Each year, Florida K–12 students are also invited to submit a design for the Everglades Challenge Coin.'] },
    ],
  },
  {
    slug: 'families-foreverglades',
    eyebrow: 'The Everglades Foundation presents',
    title: 'Families ForEverglades™',
    intro: 'A virtual family night series for parents and community members.',
    image: '/images/everglades-33.jpg',
    sections: [
      { heading: 'Family night sessions', items: ['Turtle Talk — April 2, 2024', 'Croc Talk — December 5, 2023', 'Superheroes of the Seashore — April 4, 2023', '75th Anniversary of Everglades National Park — December 6, 2022', 'Endangered Species in the Everglades', 'Invasive Species in the Everglades', 'Water for Us All', 'Everglades Animals in Your Backyard', 'Exploring the Everglades Watershed', 'Everglades Myths and Misconceptions'] },
    ],
  },
  {
    slug: 'teacher-symposium-2026',
    eyebrow: '9th Annual',
    title: 'Everglades Teacher Symposium',
    intro: 'July 22, 2026 — engaging professional development, community collaboration and practical resources for environmental educators.',
    image: '/images/everglades-29.jpeg',
    sections: [
      { heading: '2026 Sessions', items: ['Everglades Engineers: Wildlife Bridge STEM Challenge', 'Everglades Wildlife Watch', 'Champion Schools Teacher Feature', 'Green Schools Challenge', 'Picture Books as a Springboard for Learning', 'The Everglades in Every One of Us'] },
      { heading: 'Featured presenters', items: ['Isaac Nelson — Keynote', 'Alyssa Saldarriaga — Everglades Literacy Program Coordinator', 'Tate Penny — Everglades Literacy Program Coordinator', 'Graysen Boehning — FWC Statewide Participatory Science Coordinator', 'Laurie Kemble — Everglades Champion Schools Teacher', 'Susan Levine — Author, Jenny’s First Catch'] },
    ],
  },
  {
    slug: 'faq',
    eyebrow: 'Everglades Literacy Program',
    title: 'Frequently Asked Questions',
    intro: 'Answers to common questions about the Teacher Toolkit, trainings and Champion Schools.',
    image: '/images/everglades-31.jpeg',
    sections: [
      { heading: 'What is the Everglades Literacy Program?', body: ['The program empowers the next generation of conservation stewards by investing in teachers and giving schools tools, knowledge and standards-aligned lessons.'] },
      { heading: 'What is an Everglades Teacher Training?', body: ['A free professional development experience introducing the program, Teacher Toolkit, sample lessons and classroom activities.'] },
      { heading: 'How do I access the Teacher Toolkit?', body: ['The complete PreK–12 Teacher Toolkit is available online and free to educators.'] },
      { heading: 'What is an Everglades Champion School?', body: ['A school that integrates Everglades literacy into its curriculum, projects, field experiences, community and culture.'] },
      { heading: 'What are Additional Instructional Resources?', body: ['Bite-sized interdisciplinary lessons, readings, videos, print materials and dual-language activities aligned with State Academic Standards.'] },
    ],
  },
];
