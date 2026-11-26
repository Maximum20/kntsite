export type StaffRoleGroup = 'doctors' | 'specialists';
export type ShowBackCardMode = 'auto' | 'show' | 'hide';

export interface StaffRole {
  slug: string;
  title: string;
  group: StaffRoleGroup;
  order: number;
  defaultShowBackCard: boolean;
}

export interface Doctor {
  id?: string;
  name: string;
  surname: string;
  fullNamePatronymic?: string;
  role: string;
  roleSlug: string;
  roleGroup: StaffRoleGroup;
  roleOrder: number;
  roleDefaultShowBackCard: boolean;
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
  isActive: boolean;
  showBackCard: ShowBackCardMode;
  canFlip: boolean;
}
