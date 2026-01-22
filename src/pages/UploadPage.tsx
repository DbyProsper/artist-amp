import { motion } from 'framer-motion';
import { Camera, Image, Music2, Video, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function UploadPage() {
  return (
    <div className="min-h-screen pb-36">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button className="p-2 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
          <h1 className="font-display font-bold text-lg">New Post</h1>
          <Button size="sm" className="font-semibold">
            Post
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Upload Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-2 border-dashed border-muted rounded-2xl p-8 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary via-accent to-secondary mx-auto mb-4 flex items-center justify-center">
            <Music2 className="w-8 h-8 text-white" />
          </div>
          <h3 className="font-display font-bold text-lg mb-2">Upload Your Music</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Share your latest track with your fans
          </p>
          
          <div className="flex justify-center gap-4">
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
            >
              <Music2 className="w-6 h-6 text-primary" />
              <span className="text-xs">Audio</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
            >
              <Video className="w-6 h-6 text-accent" />
              <span className="text-xs">Video</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
            >
              <Image className="w-6 h-6 text-secondary" />
              <span className="text-xs">Image</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
            >
              <Camera className="w-6 h-6 text-muted-foreground" />
              <span className="text-xs">Story</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Caption */}
        <div>
          <label className="block text-sm font-medium mb-2">Caption</label>
          <Textarea
            placeholder="Write a caption for your post..."
            className="min-h-[120px] bg-muted border-none resize-none"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium mb-2">Tag Artists</label>
          <div className="flex flex-wrap gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors"
            >
              + Add artist
            </motion.button>
          </div>
        </div>

        {/* Add to Story */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
          <div>
            <p className="font-medium text-sm">Also add to Story</p>
            <p className="text-xs text-muted-foreground">Share for 24 hours</p>
          </div>
          <div className="w-12 h-6 rounded-full bg-muted relative cursor-pointer">
            <div className="absolute left-1 top-1 w-4 h-4 rounded-full bg-muted-foreground transition-all" />
          </div>
        </div>
      </div>
    </div>
  );
}
