export interface NavItem {
  id: string;
  label: string;
  href: string;
  iconName: string;
}

export interface TaskPreview {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'in_progress' | 'done';
  dueDate?: string;
}
