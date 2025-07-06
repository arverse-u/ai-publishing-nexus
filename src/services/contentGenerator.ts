import { supabase } from '@/integrations/supabase/client';

export interface GeneratedContent {
  title: string;
  content: string;
  type: 'blog' | 'social' | 'video' | 'thread';
  platform: string;
  tags?: string[];
  mediaUrl?: string;
}

export class ContentGenerator {
  private async getAISettings() {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('ai_settings')
      .select('*')
      .eq('user_id', user.user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    // Return default settings if none exist
    return data || {
      tone: 'professional',
      creativity_level: 70,
      content_length: 60,
      target_audience: 'developers',
      ai_temperature: 70,
      active_models: ['rapidapi-gpt4', 'gemini-2.0', 'llama3-8b'],
      topics: ['React', 'JavaScript', 'TypeScript', 'Web Development', 'Programming']
    };
  }

  async generateContent(platform: string, contentType: string): Promise<GeneratedContent> {
    console.log(`🎯 Starting content generation for ${platform} with topic: ${contentType}`);
    
    try {
      const settings = await this.getAISettings();
      console.log(`⚙️ Using AI settings:`, { tone: settings.tone, audience: settings.target_audience });
      
      const prompt = this.buildPrompt(platform, contentType, settings);
      console.log(`📝 Built prompt for ${platform}`);
      
      const content = await this.callAIAPI(prompt, settings);
      console.log(`🤖 AI content generated successfully for ${platform}`);
      
      // Generate enhanced platform-specific media
      let mediaUrl = '';
      if (this.needsImageGeneration(platform)) {
        console.log(`🖼️ Generating image for ${platform}`);
        try {
          mediaUrl = await this.generateEnhancedPlatformImage(content.title || content.body.substring(0, 100), platform, contentType);
          if (mediaUrl) {
            console.log(`✅ Image generated successfully for ${platform}`);
          }
        } catch (imageError) {
          console.warn(`⚠️ Image generation failed for ${platform}:`, imageError);
          // Continue without image
        }
      }
      
      const result = {
        title: content.title,
        content: content.body,
        type: this.getContentType(platform),
        platform,
        tags: content.tags,
        mediaUrl,
      };

      console.log(`✅ Content generation completed for ${platform}`);
      return result;
      
    } catch (error) {
      console.error(`❌ AI content generation failed for ${platform}:`, error);
      
      // Fallback content generation
      console.log(`🔄 Using fallback content for ${platform}`);
      return this.generateFallbackContent(platform, contentType);
    }
  }

  private generateFallbackContent(platform: string, contentType: string): GeneratedContent {
    const fallbackContent = {
      hashnode: {
        title: `Understanding ${contentType}: A Developer's Guide`,
        content: `# Understanding ${contentType}

As developers, understanding ${contentType} is crucial for building modern applications. Here's what you need to know:

## Key Concepts

${contentType} plays a vital role in today's development landscape. Whether you're building web applications, mobile apps, or working with data, having a solid grasp of these concepts will help you make better decisions.

## Best Practices

1. **Start with the basics** - Understanding fundamentals is key
2. **Practice regularly** - Consistent practice leads to mastery
3. **Stay updated** - Technology evolves rapidly
4. **Build projects** - Apply what you learn in real scenarios

## Conclusion

${contentType} is an essential skill for modern developers. Keep learning, keep building, and stay curious!`,
        tags: [contentType.toLowerCase(), 'development', 'programming', 'tutorial']
      },
      devto: {
        title: `Getting Started with ${contentType}`,
        content: `# Getting Started with ${contentType}

${contentType} is becoming increasingly important in modern development. Let's dive into the essentials.

## What is ${contentType}?

${contentType} represents a key concept that every developer should understand. It's used across various domains and can significantly impact your development workflow.

## Why Should You Care?

- **Industry Relevance**: High demand in the job market
- **Practical Applications**: Used in real-world projects
- **Career Growth**: Essential for advancing as a developer

## Quick Start Guide

1. Learn the fundamentals
2. Practice with small projects
3. Build something meaningful
4. Share your knowledge

Ready to get started? The journey begins now!`,
        tags: [contentType.toLowerCase(), 'webdev', 'tutorial', 'beginners']
      },
      default: {
        title: `Exploring ${contentType}`,
        content: `${contentType} is a fascinating topic that deserves attention. Whether you're just starting out or looking to deepen your understanding, there's always something new to discover. Let's explore the key concepts and practical applications that make ${contentType} so valuable in today's development landscape.`,
        tags: [contentType.toLowerCase(), 'development', 'learning']
      }
    };

    const content = fallbackContent[platform as keyof typeof fallbackContent] || fallbackContent.default;
    
    return {
      title: content.title,
      content: content.content,
      type: this.getContentType(platform),
      platform,
      tags: content.tags,
      mediaUrl: ''
    };
  }

  private needsImageGeneration(platform: string): boolean {
    return ['hashnode', 'devto', 'twitter', 'linkedin', 'reddit'].includes(platform);
  }

  private async generateEnhancedPlatformImage(prompt: string, platform: string, contentType: string): Promise<string> {
    try {
      console.log(`Generating enhanced image for ${platform}: ${prompt.substring(0, 50)}...`);

      // Get current user ID from Supabase auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated for image generation');
        return '';
      }

      // Enhanced prompt for better image generation
      const enhancedPrompt = this.createEnhancedImagePrompt(prompt, platform, contentType);

      const { data, error } = await supabase.functions.invoke('generate-image-gemini', {
        body: { 
          prompt: enhancedPrompt,
          platform,
          contentType,
          userId: user.id
        }
      });

      if (error) {
        console.error('Enhanced image generation failed:', error);
        return '';
      }

      return data.imageUrl || '';
    } catch (error) {
      console.error('Platform image generation failed:', error);
      return '';
    }
  }

  private createEnhancedImagePrompt(originalPrompt: string, platform: string, contentType: string): string {
    const platformStyles = {
      hashnode: 'professional blog header with code elements, clean typography, developer-focused design',
      devto: 'modern developer blog cover, tech-focused, clean and engaging design',
      twitter: 'social media optimized, eye-catching, viral-worthy design with bold text',
      linkedin: 'professional business-oriented design, corporate-friendly, clean aesthetics',
      reddit: 'community-focused, discussion-friendly design, engaging and approachable'
    };

    const styleGuide = platformStyles[platform] || platformStyles.devto;
    
    return `Create a high-quality image: ${originalPrompt}. 
    
Style requirements: ${styleGuide}
Technical specs: High resolution, sharp details, professional quality
Color scheme: Modern, platform-appropriate colors
Typography: Clean, readable fonts suitable for ${platform}
Content focus: ${contentType} content optimization
Visual elements: Balanced composition, appropriate visual hierarchy

Make it visually striking and platform-optimized for ${platform}.`;
  }

  private buildPrompt(platform: string, contentType: string, settings: any): string {
    const topics = Array.isArray(settings.topics) ? settings.topics : ['Programming', 'Web Development'];
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    
    const basePrompts = {
      hashnode: this.getBlogPrompt(settings, 'hashnode', randomTopic),
      devto: this.getBlogPrompt(settings, 'devto', randomTopic),
      twitter: this.getSocialPrompt(settings, 'twitter', randomTopic),
      linkedin: this.getSocialPrompt(settings, 'linkedin', randomTopic),
      instagram: this.getVideoPrompt(settings, 'instagram', randomTopic),
      youtube: this.getVideoPrompt(settings, 'youtube', randomTopic),
      reddit: this.getSocialPrompt(settings, 'reddit', randomTopic),
    };

    return basePrompts[platform as keyof typeof basePrompts] || basePrompts.devto;
  }

  private calculateWordCount(platform: string, contentLength: number): string {
    const baseCounts = {
      hashnode: { min: 1500, max: 2500 },
      devto: { min: 800, max: 1500 },
      default: { min: 500, max: 1000 }
    };

    const counts = baseCounts[platform as keyof typeof baseCounts] || baseCounts.default;
    const lengthMultiplier = contentLength / 100;
    
    const targetMin = Math.round(counts.min * lengthMultiplier);
    const targetMax = Math.round(counts.max * lengthMultiplier);
    
    return `${targetMin}-${targetMax}`;
  }

  private getBlogPrompt(settings: any, platform: string, topic: string): string {
    const wordCount = this.calculateWordCount(platform, settings.content_length);
    const currentDate = new Date().toLocaleDateString();
    const temperatureInstruction = this.getTemperatureInstruction(settings.ai_temperature);
    const audienceContext = this.getAudienceContext(settings.target_audience);
    
    return `Generate a comprehensive technical blog post about ${topic} for ${platform}.
    
Current date: ${currentDate}
Tone: ${settings.tone}
Target Audience: ${settings.target_audience} ${audienceContext}
Creativity: ${settings.creativity_level}% (0=conservative, 100=highly creative)
Temperature Setting: ${settings.ai_temperature}% ${temperatureInstruction}
Length: ${settings.content_length}% (aim for ${wordCount} words)

Requirements:
- Original, SEO-optimized title
- Current trends and best practices (2024-2025)
- Practical code examples where relevant
- Clear structure with headers and subheaders
- Actionable insights developers can implement
- Include real-world use cases
- Modern development practices
- No outdated information
${audienceContext}

Format: Return ONLY valid JSON with this exact structure:
{
  "title": "Compelling SEO-optimized title",
  "body": "Full markdown content with headers, code blocks, and examples",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "mediaUrl": ""
}`;
  }

  private calculateCharacterLimit(platform: string, contentLength: number): string {
    const baseLimits = {
      twitter: 280,
      linkedin: 3000,
      reddit: 40000,
      default: 1000
    };

    const baseLimit = baseLimits[platform as keyof typeof baseLimits] || baseLimits.default;
    const lengthMultiplier = contentLength / 100;
    const targetLimit = Math.round(baseLimit * lengthMultiplier);
    
    return `${targetLimit} characters max`;
  }

  private getSocialPrompt(settings: any, platform: string, topic: string): string {
    const characterLimit = this.calculateCharacterLimit(platform, settings.content_length);
    const temperatureInstruction = this.getTemperatureInstruction(settings.ai_temperature);
    const audienceContext = this.getAudienceContext(settings.target_audience);
    
    return `Generate engaging social media content about ${topic} for ${platform}.

Tone: ${settings.tone}
Target Audience: ${settings.target_audience} ${audienceContext}
Creativity: ${settings.creativity_level}%
Temperature Setting: ${settings.ai_temperature}% ${temperatureInstruction}
Content focus: ${topic}
Character limit: ${characterLimit}

Platform-specific requirements:
${platform === 'twitter' ? '- Can create thread with multiple tweets\n- Use relevant hashtags\n- Engaging hook in first tweet' : ''}
${platform === 'linkedin' ? '- Professional tone\n- Include call-to-action\n- Use emojis sparingly\n- Focus on career insights' : ''}
${platform === 'reddit' ? '- Community-focused\n- Provide real value\n- Avoid self-promotion\n- Engage in discussion format' : ''}

Requirements:
- Hook readers immediately
- Provide actionable value
- Include relevant hashtags
- Encourage engagement
- Current tech trends (2024-2025)
- No generic content
${audienceContext}

Format: Return ONLY valid JSON:
{
  "title": "Post title or first line",
  "body": "Complete post content with formatting",
  "tags": ["hashtag1", "hashtag2", "hashtag3"],
  "mediaUrl": ""
}`;
  }

  private calculateVideoDuration(platform: string, contentLength: number): string {
    const baseDurations = {
      instagram: { min: 15, max: 30 },
      youtube: { min: 30, max: 60 },
      default: { min: 20, max: 45 }
    };

    const duration = baseDurations[platform as keyof typeof baseDurations] || baseDurations.default;
    const lengthMultiplier = contentLength / 100;
    
    const targetMin = Math.round(duration.min * lengthMultiplier);
    const targetMax = Math.round(duration.max * lengthMultiplier);
    
    return `${targetMin}-${targetMax} seconds`;
  }

  private getVideoPrompt(settings: any, platform: string, topic: string): string {
    const duration = this.calculateVideoDuration(platform, settings.content_length);
    const temperatureInstruction = this.getTemperatureInstruction(settings.ai_temperature);
    const audienceContext = this.getAudienceContext(settings.target_audience);
    
    return `Generate a video script about ${topic} for ${platform} Shorts/Reels.

Duration: ${duration}
Tone: ${settings.tone}
Target Audience: ${settings.target_audience} ${audienceContext}
Temperature Setting: ${settings.ai_temperature}% ${temperatureInstruction}
Topic: ${topic}

Requirements:
- Hook viewers in first 3 seconds
- Visual scripting with [VISUAL: description] cues
- Clear, engaging narration
- Quick tips or insights
- Call to action at end
- Mobile-first format
- Trending topic angle
${audienceContext}

Script format:
- Include timing cues
- Visual descriptions for each scene
- Engaging narration text
- Background music suggestions

Format: Return ONLY valid JSON:
{
  "title": "Engaging video title",
  "body": "Complete script with [VISUAL:] cues and narration",
  "tags": ["tag1", "tag2", "tag3"],
  "mediaUrl": "placeholder-for-generated-video"
}`;
  }

  private getTemperatureInstruction(temperature: number): string {
    if (temperature <= 30) return '(be very conservative and predictable)';
    if (temperature <= 50) return '(be somewhat conservative with moderate creativity)';
    if (temperature <= 70) return '(balance creativity with reliability)';
    if (temperature <= 85) return '(be creative and engaging)';
    return '(be highly creative and experimental)';
  }

  private getAudienceContext(audience: string): string {
    const contexts = {
      developers: '- Use technical terminology appropriately\n- Include code examples and technical insights\n- Focus on implementation details and best practices',
      students: '- Explain concepts clearly with examples\n- Use educational tone and step-by-step approach\n- Include learning resources and practical exercises',
      entrepreneurs: '- Focus on business value and ROI\n- Include market insights and growth strategies\n- Emphasize practical applications and opportunities',
      designers: '- Focus on visual design principles and UX\n- Include design tools and workflow tips\n- Emphasize creativity and aesthetic considerations',
      marketers: '- Focus on marketing strategies and conversion\n- Include growth hacking techniques and analytics\n- Emphasize audience engagement and brand building',
      professionals: '- Use professional language and industry insights\n- Focus on career development and productivity\n- Include networking and skill-building advice',
      technical: '- Use advanced technical terminology\n- Include detailed implementation specifics\n- Focus on architecture and system design',
      general: '- Use accessible language for broad audience\n- Explain technical terms when used\n- Focus on practical benefits and real-world applications'
    };
    
    return contexts[audience as keyof typeof contexts] || contexts.general;
  }

  private async callAIAPI(prompt: string, settings: any): Promise<any> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    console.log('🤖 Calling AI API for content generation...');

    try {
      // Try to call the edge function for AI generation
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: { 
          prompt, 
          settings,
          model: this.selectBestModel(settings.active_models || ['rapidapi-gpt4']),
          userId: user.user.id
        }
      });

      if (error) {
        console.error('❌ AI edge function failed:', error);
        throw new Error(`AI generation failed: ${error.message}`);
      }

      if (!data || !data.title || !data.body) {
        console.error('❌ Invalid AI response:', data);
        throw new Error('AI returned invalid response format');
      }

      console.log('✅ AI API call successful');
      return data;
      
    } catch (error) {
      console.error('❌ AI API call failed:', error);
      throw error;
    }
  }

  private selectBestModel(activeModels: string[]): string {
    // Prioritize models based on capability and speed
    const modelPriority = ['rapidapi-gpt4', 'gemini-2.0', 'llama3-8b'];
    
    for (const model of modelPriority) {
      if (activeModels.includes(model)) {
        return model;
      }
    }
    
    return activeModels[0] || 'rapidapi-gpt4';
  }

  private getContentType(platform: string): 'blog' | 'social' | 'video' | 'thread' {
    if (['hashnode', 'devto'].includes(platform)) return 'blog';
    if (['instagram', 'youtube'].includes(platform)) return 'video';
    if (platform === 'twitter') return 'thread';
    return 'social';
  }
}

export const contentGenerator = new ContentGenerator();
