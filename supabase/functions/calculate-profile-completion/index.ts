import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createErrorResponse } from "../_shared/error-handler.ts";

interface ProfileCompletionResult {
  score: number;
  maxScore: number;
  percentage: number;
  missingFields: string[];
  completedFields: string[];
}

// Field weights for profile completion
const FIELD_WEIGHTS: Record<string, { weight: number; label: string }> = {
  // Core profile fields
  full_name: { weight: 15, label: 'Full Name' },
  avatar_url: { weight: 10, label: 'Profile Photo' },
  phone: { weight: 10, label: 'Phone Number' },
  title: { weight: 5, label: 'Job Title' },
  
  // Extended profile fields
  bio: { weight: 10, label: 'Bio' },
  headline: { weight: 5, label: 'Headline' },
  brokerage_name: { weight: 5, label: 'Brokerage Name' },
  license_number: { weight: 10, label: 'License Number' },
  license_state: { weight: 5, label: 'License State' },
  years_experience: { weight: 5, label: 'Years of Experience' },
  specialties: { weight: 5, label: 'Specialties' },
  service_areas: { weight: 5, label: 'Service Areas' },
  cover_photo_url: { weight: 5, label: 'Cover Photo' },
  website_url: { weight: 5, label: 'Website' },
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with service role to fetch profile
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create user client to get user ID
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate completion
    let score = 0;
    let maxScore = 0;
    const missingFields: string[] = [];
    const completedFields: string[] = [];

    for (const [field, config] of Object.entries(FIELD_WEIGHTS)) {
      maxScore += config.weight;
      
      const value = profile[field];
      const isComplete = value !== null && value !== undefined && value !== '' && 
        (Array.isArray(value) ? value.length > 0 : true);
      
      if (isComplete) {
        score += config.weight;
        completedFields.push(config.label);
      } else {
        missingFields.push(config.label);
      }
    }

    // Check for social links (bonus)
    const { count: socialLinksCount } = await supabase
      .from('profile_social_links')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (socialLinksCount && socialLinksCount > 0) {
      completedFields.push('Social Links');
    } else {
      missingFields.push('Social Links');
    }

    // Check for credentials (bonus)
    const { count: credentialsCount } = await supabase
      .from('profile_credentials')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (credentialsCount && credentialsCount > 0) {
      completedFields.push('Credentials');
    } else {
      missingFields.push('Credentials');
    }

    const result: ProfileCompletionResult = {
      score,
      maxScore,
      percentage: Math.round((score / maxScore) * 100),
      missingFields,
      completedFields,
    };

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return createErrorResponse(error, corsHeaders, {
      functionName: "calculate-profile-completion",
      logContext: { endpoint: "calculate-profile-completion" },
    });
  }
});
