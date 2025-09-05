import React from 'react';
import { LucideIcon } from 'lucide-react';

interface NoDataStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  subtitle?: string;
  className?: string;
}

const NoDataState: React.FC<NoDataStateProps> = ({
  icon: Icon,
  title,
  description,
  subtitle,
  className = ''
}) => {
  return (
    <div className={`text-center py-8 ${className}`}>
      <div className="text-gray-400 mb-4">
        <Icon className="w-12 h-12 mx-auto" />
      </div>
      <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        {title}
      </h4>
      <p className="text-gray-500 dark:text-gray-400 mb-2">
        {description}
      </p>
      {subtitle && (
        <p className="text-sm text-gray-400 dark:text-gray-500">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default NoDataState;
