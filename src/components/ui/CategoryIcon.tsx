import React from 'react';
import * as Icons from 'lucide-react';

interface CategoryIconProps {
  name: string;
  className?: string;
  color?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, className = 'w-4 h-4', color }) => {
  // @ts-expect-error Lucide dynamic icon access
  const IconComponent = Icons[name] || Icons.CircleDot;
  return <IconComponent className={className} style={{ color }} />;
};
