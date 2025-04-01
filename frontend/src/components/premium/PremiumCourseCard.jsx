import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Button from '../common/Button';
import { useAuth } from '../../contexts/AuthContext'; 
import { subscriptionAPI } from '../../services/api';
import { useState, useEffect } from 'react';

const PremiumCourseCard = ({ course, isPurchased = false, progress = null }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  
  // Check if user has access to premium courses
  useEffect(() => {
    const checkAccess = async () => {
      if (!user) return;
      
      try {
        // Only check access if the course is premium (not free)
        if (!course.isFree) {
          const response = await subscriptionAPI.checkFeatureAccess('premiumCourses');
          setHasAccess(response.data.hasAccess);
        } else {
          setHasAccess(true); // Free courses are accessible to everyone
        }
      } catch (error) {
        console.error('Error checking premium course access:', error);
      }
    };
    
    checkAccess();
  }, [user, course.isFree]);
  
  // Calculate progress percentage if progress data is available
  const progressPercentage = progress ? 
    (progress.completedItems / progress.totalItems) * 100 : 0;
  
  // Format course difficulty into a user-friendly label
  const getDifficultyLabel = (difficulty) => {
    switch(difficulty.toLowerCase()) {
      case 'beginner':
        return { label: 'Beginner', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' };
      case 'intermediate':
        return { label: 'Intermediate', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' };
      case 'advanced':
        return { label: 'Advanced', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' };
      case 'expert':
        return { label: 'Expert', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' };
      default:
        return { label: difficulty, color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400' };
    }
  };
  
  const difficultyInfo = getDifficultyLabel(course.difficulty);
  
  // Handle card click
  const handleCardClick = () => {
    if (isPurchased || course.isFree || hasAccess) {
      navigate(`/courses/${course.id}`);
    } else {
      // If not purchased and not free, go to course details page where user can purchase
      navigate(`/marketplace/courses/${course.id}`);
    }
  };
  
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="flex flex-col h-full"
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden h-full flex flex-col cursor-pointer border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
        onClick={handleCardClick}
      >
        {/* Course image/thumbnail */}
        <div className="relative">
          <img 
            src={course.thumbnailUrl || 'https://via.placeholder.com/400x200?text=Course'} 
            alt={course.title}
            className="w-full h-48 object-cover"
          />
          
          {/* Pricing badge */}
          <div className="absolute top-4 right-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              course.isFree 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
            }`}>
              {course.isFree ? 'Free' : `$${course.price.toFixed(2)}`}
            </span>
          </div>
          
          {/* Progress indicator for purchased courses */}
          {isPurchased && (
            <div className="absolute bottom-0 left-0 right-0 bg-gray-800/70 text-white px-4 py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm font-medium">{Math.round(progressPercentage)}%</span>
              </div>
              <div className="w-full h-2 bg-gray-700 rounded-full mt-1 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="p-6 flex-grow flex flex-col">
          <div className="flex-grow">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${difficultyInfo.color}`}>
                {difficultyInfo.label}
              </span>
              <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                {course.category}
              </span>
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{course.title}</h3>
            
            <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{course.description}</p>
            
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              {course.sectionCount} Sections • {course.itemCount} Lessons
            </div>
            
            {course.authorName && (
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium text-sm mr-2">
                  {course.authorName.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {course.authorName}
                </span>
              </div>
            )}
          </div>
          
          {/* Action button */}
          <div className="mt-auto">
            {isPurchased ? (
              <Button 
                variant={progressPercentage > 0 ? "secondary" : "primary"}
                className="w-full"
              >
                {progressPercentage > 0 ? 'Continue Learning' : 'Start Course'}
              </Button>
            ) : course.isFree ? (
              <Button 
                variant="primary"
                className="w-full"
              >
                Start Free Course
              </Button>
            ) : hasAccess ? (
              <Button 
                variant="primary"
                className="w-full"
              >
                Start Course
              </Button>
            ) : (
              <Button 
                variant="secondary"
                className="w-full"
              >
                View Details
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PremiumCourseCard; 