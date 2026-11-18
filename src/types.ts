export interface Doctor {
  id?: string;
  name: string;
  surname: string;
  fullNamePatronymic?: string;
  role: string;
  department: string;
  initials: string;
  bio: string;
  image: string;
  experience: string;
  specializations: string[];
  education: string;
  achievements: string;
  color: string;
  badge?: string;
  isHead?: boolean;
  order?: number;
  isVisible?: boolean;
}
