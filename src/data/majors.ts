// The standard majors list every campus starts with. Students can add a missing one for
// their own campus. Ids are stable slugs so the demo build and the server agree.
const NAMES = [
  'Accounting', 'Actuarial Science', 'Agriculture', 'Allied Health Sciences', 'Animal Science', 'Anthropology',
  'Architecture', 'Art', 'Biology', 'Biomedical Engineering', 'Business Administration', 'Chemical Engineering',
  'Chemistry', 'Civil Engineering', 'Communication', 'Computer Engineering', 'Computer Science', 'Criminal Justice',
  'Data Science', 'Dietetics and Nutrition', 'Economics', 'Education', 'Electrical Engineering', 'English',
  'Environmental Science', 'Exercise Science', 'Finance', 'Graphic Design', 'History', 'Human Development',
  'Information Systems', 'International Relations', 'Journalism', 'Kinesiology', 'Management', 'Marketing',
  'Materials Science', 'Mathematics', 'Mechanical Engineering', 'Molecular and Cell Biology', 'Music',
  'Neuroscience', 'Nursing', 'Pharmacy', 'Philosophy', 'Physical Therapy', 'Physics', 'Physiology',
  'Political Science', 'Pre-Law', 'Pre-Med', 'Psychology', 'Public Health', 'Sociology', 'Sport Management',
  'Statistics', 'Theater', 'Undeclared',
] as const;

export const majorId = (name: string) => `major-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

export const MAJORS = NAMES.map(name => ({ id: majorId(name), name }));
