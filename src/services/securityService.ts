
import { supabase } from '@/integrations/supabase/client';

export class SecurityService {
  async logSecurityEvent(eventType: string, details: any = {}, userId?: string) {
    try {
      // Only log if we have a valid user session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('Cannot log security event: No authenticated user');
        return;
      }

      const { error } = await supabase
        .from('security_audit_logs')
        .insert({
          user_id: user.id,
          event_type: eventType,
          event_details: details,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to log security event:', error);
      }
    } catch (error) {
      console.error('Security logging error:', error);
    }
  }

  async logCredentialAccess(platform: string, action: string) {
    await this.logSecurityEvent('credential_access', {
      platform,
      action,
      timestamp: new Date().toISOString()
    });
  }

  async logAuthEvent(eventType: string, details: any = {}) {
    await this.logSecurityEvent('auth_event', {
      event_type: eventType,
      ...details,
      timestamp: new Date().toISOString()
    });
  }

  async validateCredentials(credentials: any): Promise<boolean> {
    // Basic validation - ensure credentials exist and are not empty
    if (!credentials || typeof credentials !== 'object') {
      return false;
    }

    // Check for required fields based on credential type
    const requiredFields = {
      gemini_key: ['api_key'],
      pexels_key: ['api_key'],
      rapidapi_key: ['api_key'],
      groq_key: ['api_key']
    };

    for (const [key, fields] of Object.entries(requiredFields)) {
      if (credentials[key]) {
        for (const field of fields) {
          if (!credentials[key][field] || credentials[key][field].trim() === '') {
            return false;
          }
        }
      }
    }

    return true;
  }

  async checkRateLimit(userId: string, action: string): Promise<boolean> {
    // Simple rate limiting check
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('security_audit_logs')
        .select('id')
        .eq('user_id', userId)
        .eq('event_type', action)
        .gte('created_at', oneHourAgo);

      if (error) {
        console.error('Rate limit check error:', error);
        return true; // Allow on error
      }

      // Allow max 100 actions per hour
      return (data?.length || 0) < 100;
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return true; // Allow on error
    }
  }
}

export const securityService = new SecurityService();
