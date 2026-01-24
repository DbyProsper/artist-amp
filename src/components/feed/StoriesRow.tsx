import { motion } from 'framer-motion';
import { Story } from '@/types';
import { cn } from '@/lib/utils';

interface StoryCircleProps {
  story: Story;
  onClick?: () => void;
}

export function StoryCircle({ story, onClick }: StoryCircleProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex flex-col items-center gap-1 flex-shrink-0"
    >
      <div
        className={cn(
          "w-16 h-16 rounded-full p-[2px]",
          story.viewed
            ? "bg-muted"
            : "bg-gradient-to-tr from-primary via-accent to-secondary"
        )}
      >
        <div className="w-full h-full rounded-full overflow-hidden bg-background p-[2px]">
          <img
            src={story.artist.avatar}
            alt={story.artist.name}
            className="w-full h-full rounded-full object-cover"
          />
        </div>
      </div>
      <span className="text-[11px] text-muted-foreground truncate w-16 text-center">
        {story.artist.name.split(' ')[0]}
      </span>
    </motion.button>
  );
}

interface StoriesRowProps {
  stories: Story[];
  onStoryClick?: (story: Story) => void;
}

export function StoriesRow({ stories, onStoryClick }: StoriesRowProps) {
  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-hide py-4 px-4">
      {stories.map((story) => (
        <StoryCircle
          key={story.id}
          story={story}
          onClick={() => onStoryClick?.(story)}
        />
      ))}
    </div>
  );
}
