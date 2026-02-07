export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string
          created_at: string | null
          formatted_address: string | null
          id: string
          latitude: number | null
          longitude: number | null
          state: string
          street_address: string
          unit: string | null
          zip_code: string
        }
        Insert: {
          city: string
          created_at?: string | null
          formatted_address?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          state: string
          street_address: string
          unit?: string | null
          zip_code: string
        }
        Update: {
          city?: string
          created_at?: string | null
          formatted_address?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          state?: string
          street_address?: string
          unit?: string | null
          zip_code?: string
        }
        Relationships: []
      }
      agent_runs: {
        Row: {
          agent_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          input_context: Json
          output_result: Json | null
          status: string
          tenant_id: string
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          agent_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_context?: Json
          output_result?: Json | null
          status?: string
          tenant_id: string
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          agent_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_context?: Json
          output_result?: Json | null
          status?: string
          tenant_id?: string
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_certified: boolean | null
          is_public: boolean | null
          name: string
          system_prompt: string | null
          tenant_id: string | null
          updated_at: string
          usage_count: number | null
          workflow: Json | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_certified?: boolean | null
          is_public?: boolean | null
          name: string
          system_prompt?: string | null
          tenant_id?: string | null
          updated_at?: string
          usage_count?: number | null
          workflow?: Json | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_certified?: boolean | null
          is_public?: boolean | null
          name?: string
          system_prompt?: string | null
          tenant_id?: string | null
          updated_at?: string
          usage_count?: number | null
          workflow?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          tenant_id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tenant_id: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tenant_id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          embedded_components: Json | null
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          embedded_components?: Json | null
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          embedded_components?: Json | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_agents: {
        Row: {
          agent_user_id: string
          contact_id: string
          created_at: string
          id: string
          relationship_type: string | null
        }
        Insert: {
          agent_user_id: string
          contact_id: string
          created_at?: string
          id?: string
          relationship_type?: string | null
        }
        Update: {
          agent_user_id?: string
          contact_id?: string
          created_at?: string
          id?: string
          relationship_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_agents_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address_id: string | null
          best_time_to_call: string | null
          company: string | null
          contact_type: string | null
          created_at: string
          created_by: string | null
          custom_fields: Json | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          lead_source: string | null
          lease_expiration: string | null
          lender_name: string | null
          listing_timeline: string | null
          notes: string | null
          owned_property_address: string | null
          phone: string | null
          pre_approval_amount: number | null
          pre_approval_status: string | null
          preferred_areas: string[] | null
          preferred_baths: number | null
          preferred_beds: number | null
          preferred_contact_method: string | null
          preferred_property_types: string[] | null
          price_max: number | null
          price_min: number | null
          referral_source: string | null
          secondary_email: string | null
          secondary_phone: string | null
          seller_motivation: string | null
          status: string | null
          tags: string[] | null
          target_move_date: string | null
          tenant_id: string
          updated_at: string
          urgency_level: string | null
          user_id: string | null
        }
        Insert: {
          address_id?: string | null
          best_time_to_call?: string | null
          company?: string | null
          contact_type?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          lead_source?: string | null
          lease_expiration?: string | null
          lender_name?: string | null
          listing_timeline?: string | null
          notes?: string | null
          owned_property_address?: string | null
          phone?: string | null
          pre_approval_amount?: number | null
          pre_approval_status?: string | null
          preferred_areas?: string[] | null
          preferred_baths?: number | null
          preferred_beds?: number | null
          preferred_contact_method?: string | null
          preferred_property_types?: string[] | null
          price_max?: number | null
          price_min?: number | null
          referral_source?: string | null
          secondary_email?: string | null
          secondary_phone?: string | null
          seller_motivation?: string | null
          status?: string | null
          tags?: string[] | null
          target_move_date?: string | null
          tenant_id: string
          updated_at?: string
          urgency_level?: string | null
          user_id?: string | null
        }
        Update: {
          address_id?: string | null
          best_time_to_call?: string | null
          company?: string | null
          contact_type?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          lead_source?: string | null
          lease_expiration?: string | null
          lender_name?: string | null
          listing_timeline?: string | null
          notes?: string | null
          owned_property_address?: string | null
          phone?: string | null
          pre_approval_amount?: number | null
          pre_approval_status?: string | null
          preferred_areas?: string[] | null
          preferred_baths?: number | null
          preferred_beds?: number | null
          preferred_contact_method?: string | null
          preferred_property_types?: string[] | null
          price_max?: number | null
          price_min?: number | null
          referral_source?: string | null
          secondary_email?: string | null
          secondary_phone?: string | null
          seller_motivation?: string | null
          status?: string | null
          tags?: string[] | null
          target_move_date?: string | null
          tenant_id?: string
          updated_at?: string
          urgency_level?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          muted: boolean
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          muted?: boolean
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          muted?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          archived: boolean
          created_at: string
          id: string
          tenant_id: string
          title: string | null
          type: Database["public"]["Enums"]["conversation_type"]
          updated_at: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          id?: string
          tenant_id: string
          title?: string | null
          type?: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          id?: string
          tenant_id?: string
          title?: string | null
          type?: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          deal_id: string
          due_date: string | null
          id: string
          notes: string | null
          title: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          deal_id: string
          due_date?: string | null
          id?: string
          notes?: string | null
          title: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          deal_id?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_milestones_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          actual_close_date: string | null
          agent_id: string | null
          appraisal_date: string | null
          appraisal_value: number | null
          attorney_contact_id: string | null
          buyer_stage: Database["public"]["Enums"]["deal_stage_buyer"] | null
          buyer_user_id: string | null
          co_buyer_contact_id: string | null
          co_seller_contact_id: string | null
          commission_rate: number | null
          contact_id: string | null
          created_at: string
          deal_type: string
          earnest_money: number | null
          escrow_officer_name: string | null
          escrow_officer_phone: string | null
          estimated_value: number | null
          expected_close_date: string | null
          final_sale_price: number | null
          financing_deadline: string | null
          has_appraisal_contingency: boolean | null
          has_financing_contingency: boolean | null
          has_inspection_contingency: boolean | null
          has_sale_contingency: boolean | null
          id: string
          inspection_date: string | null
          inspector_contact_id: string | null
          lender_name: string | null
          loan_officer_email: string | null
          loan_officer_name: string | null
          loan_officer_phone: string | null
          loan_type: string | null
          notes: string | null
          option_fee: number | null
          option_period_end: string | null
          property_id: string | null
          seller_stage: Database["public"]["Enums"]["deal_stage_seller"] | null
          seller_user_id: string | null
          stage: string | null
          tenant_id: string
          title_company: string | null
          title_policy_type: string | null
          updated_at: string
        }
        Insert: {
          actual_close_date?: string | null
          agent_id?: string | null
          appraisal_date?: string | null
          appraisal_value?: number | null
          attorney_contact_id?: string | null
          buyer_stage?: Database["public"]["Enums"]["deal_stage_buyer"] | null
          buyer_user_id?: string | null
          co_buyer_contact_id?: string | null
          co_seller_contact_id?: string | null
          commission_rate?: number | null
          contact_id?: string | null
          created_at?: string
          deal_type: string
          earnest_money?: number | null
          escrow_officer_name?: string | null
          escrow_officer_phone?: string | null
          estimated_value?: number | null
          expected_close_date?: string | null
          final_sale_price?: number | null
          financing_deadline?: string | null
          has_appraisal_contingency?: boolean | null
          has_financing_contingency?: boolean | null
          has_inspection_contingency?: boolean | null
          has_sale_contingency?: boolean | null
          id?: string
          inspection_date?: string | null
          inspector_contact_id?: string | null
          lender_name?: string | null
          loan_officer_email?: string | null
          loan_officer_name?: string | null
          loan_officer_phone?: string | null
          loan_type?: string | null
          notes?: string | null
          option_fee?: number | null
          option_period_end?: string | null
          property_id?: string | null
          seller_stage?: Database["public"]["Enums"]["deal_stage_seller"] | null
          seller_user_id?: string | null
          stage?: string | null
          tenant_id: string
          title_company?: string | null
          title_policy_type?: string | null
          updated_at?: string
        }
        Update: {
          actual_close_date?: string | null
          agent_id?: string | null
          appraisal_date?: string | null
          appraisal_value?: number | null
          attorney_contact_id?: string | null
          buyer_stage?: Database["public"]["Enums"]["deal_stage_buyer"] | null
          buyer_user_id?: string | null
          co_buyer_contact_id?: string | null
          co_seller_contact_id?: string | null
          commission_rate?: number | null
          contact_id?: string | null
          created_at?: string
          deal_type?: string
          earnest_money?: number | null
          escrow_officer_name?: string | null
          escrow_officer_phone?: string | null
          estimated_value?: number | null
          expected_close_date?: string | null
          final_sale_price?: number | null
          financing_deadline?: string | null
          has_appraisal_contingency?: boolean | null
          has_financing_contingency?: boolean | null
          has_inspection_contingency?: boolean | null
          has_sale_contingency?: boolean | null
          id?: string
          inspection_date?: string | null
          inspector_contact_id?: string | null
          lender_name?: string | null
          loan_officer_email?: string | null
          loan_officer_name?: string | null
          loan_officer_phone?: string | null
          loan_type?: string | null
          notes?: string | null
          option_fee?: number | null
          option_period_end?: string | null
          property_id?: string | null
          seller_stage?: Database["public"]["Enums"]["deal_stage_seller"] | null
          seller_user_id?: string | null
          stage?: string | null
          tenant_id?: string
          title_company?: string | null
          title_policy_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_attorney_contact_id_fkey"
            columns: ["attorney_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_co_buyer_contact_id_fkey"
            columns: ["co_buyer_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_co_seller_contact_id_fkey"
            columns: ["co_seller_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_inspector_contact_id_fkey"
            columns: ["inspector_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      document_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_indexing_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          current_batch: number
          document_id: string
          error_message: string | null
          id: string
          indexed_chunks: number
          progress: number
          started_at: string | null
          status: string
          tenant_id: string
          total_batches: number
          total_chunks: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_batch?: number
          document_id: string
          error_message?: string | null
          id?: string
          indexed_chunks?: number
          progress?: number
          started_at?: string | null
          status?: string
          tenant_id: string
          total_batches?: number
          total_chunks?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_batch?: number
          document_id?: string
          error_message?: string | null
          id?: string
          indexed_chunks?: number
          progress?: number
          started_at?: string | null
          status?: string
          tenant_id?: string
          total_batches?: number
          total_chunks?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_indexing_jobs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_indexing_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      document_metadata: {
        Row: {
          created_at: string | null
          document_id: string
          document_type: string
          extracted_data: Json | null
          extraction_model: string | null
          id: string
          key_facts: string[] | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          document_id: string
          document_type: string
          extracted_data?: Json | null
          extraction_model?: string | null
          id?: string
          key_facts?: string[] | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: string
          document_type?: string
          extracted_data?: Json | null
          extraction_model?: string | null
          id?: string
          key_facts?: string[] | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_metadata_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_metadata_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      document_project_members: {
        Row: {
          added_at: string
          added_by: string | null
          document_id: string
          id: string
          project_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          document_id: string
          id?: string
          project_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          document_id?: string
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_project_members_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "document_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      document_projects: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          ai_summary: string | null
          category: string | null
          contact_id: string | null
          created_at: string
          deal_id: string | null
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          indexed_at: string | null
          name: string
          project_id: string | null
          property_id: string | null
          tenant_id: string
          uploaded_by: string | null
        }
        Insert: {
          ai_summary?: string | null
          category?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          indexed_at?: string | null
          name: string
          project_id?: string | null
          property_id?: string | null
          tenant_id: string
          uploaded_by?: string | null
        }
        Update: {
          ai_summary?: string | null
          category?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          indexed_at?: string | null
          name?: string
          project_id?: string | null
          property_id?: string | null
          tenant_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "document_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      external_properties: {
        Row: {
          address: Json | null
          bathrooms: number | null
          bedrooms: number | null
          created_at: string | null
          description: string | null
          external_id: string
          id: string
          last_synced_at: string | null
          lot_size: number | null
          photos: string[] | null
          price: number | null
          property_type: string | null
          raw_data: Json | null
          source: string
          square_feet: number | null
          status: string | null
          updated_at: string | null
          year_built: number | null
        }
        Insert: {
          address?: Json | null
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string | null
          description?: string | null
          external_id: string
          id?: string
          last_synced_at?: string | null
          lot_size?: number | null
          photos?: string[] | null
          price?: number | null
          property_type?: string | null
          raw_data?: Json | null
          source: string
          square_feet?: number | null
          status?: string | null
          updated_at?: string | null
          year_built?: number | null
        }
        Update: {
          address?: Json | null
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string | null
          description?: string | null
          external_id?: string
          id?: string
          last_synced_at?: string | null
          lot_size?: number | null
          photos?: string[] | null
          price?: number | null
          property_type?: string | null
          raw_data?: Json | null
          source?: string
          square_feet?: number | null
          status?: string | null
          updated_at?: string | null
          year_built?: number | null
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          id: string
          message_id: string
          user_id: string
          emoji: string
          created_at: string
          tenant_id: string
        }
        Insert: {
          id?: string
          message_id: string
          user_id: string
          emoji: string
          created_at?: string
          tenant_id: string
        }
        Update: {
          id?: string
          message_id?: string
          user_id?: string
          emoji?: string
          created_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number
          file_type: string
          id: string
          message_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size: number
          file_type: string
          id?: string
          message_id: string
          storage_path: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          message_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          edited_at: string | null
          file_url: string | null
          id: string
          message_type: Database["public"]["Enums"]["message_type"]
          sender_id: string
          sent_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          edited_at?: string | null
          file_url?: string | null
          id?: string
          message_type?: Database["public"]["Enums"]["message_type"]
          sender_id: string
          sent_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          edited_at?: string | null
          file_url?: string | null
          id?: string
          message_type?: Database["public"]["Enums"]["message_type"]
          sender_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string | null
          created_at: string
          email_sent: boolean
          id: string
          metadata: Json | null
          read: boolean
          tenant_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          email_sent?: boolean
          id?: string
          metadata?: Json | null
          read?: boolean
          tenant_id: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          email_sent?: boolean
          id?: string
          metadata?: Json | null
          read?: boolean
          tenant_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_credentials: {
        Row: {
          created_at: string | null
          credential_number: string | null
          credential_type: string
          expiry_date: string | null
          id: string
          is_verified: boolean | null
          issue_date: string | null
          issuer: string | null
          title: string
          updated_at: string | null
          user_id: string
          verification_url: string | null
        }
        Insert: {
          created_at?: string | null
          credential_number?: string | null
          credential_type: string
          expiry_date?: string | null
          id?: string
          is_verified?: boolean | null
          issue_date?: string | null
          issuer?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          verification_url?: string | null
        }
        Update: {
          created_at?: string | null
          credential_number?: string | null
          credential_type?: string
          expiry_date?: string | null
          id?: string
          is_verified?: boolean | null
          issue_date?: string | null
          issuer?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          verification_url?: string | null
        }
        Relationships: []
      }
      profile_gallery: {
        Row: {
          caption: string | null
          created_at: string | null
          display_order: number | null
          filename: string
          id: string
          storage_path: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          filename: string
          id?: string
          storage_path: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          filename?: string
          id?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_privacy_settings: {
        Row: {
          created_at: string | null
          id: string
          profile_visibility: string | null
          show_credentials: boolean | null
          show_email: boolean | null
          show_gallery: boolean | null
          show_phone: boolean | null
          show_social_links: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          profile_visibility?: string | null
          show_credentials?: boolean | null
          show_email?: boolean | null
          show_gallery?: boolean | null
          show_phone?: boolean | null
          show_social_links?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          profile_visibility?: string | null
          show_credentials?: boolean | null
          show_email?: boolean | null
          show_gallery?: boolean | null
          show_phone?: boolean | null
          show_social_links?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profile_social_links: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          platform: string
          updated_at: string | null
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          platform: string
          updated_at?: string | null
          url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          platform?: string
          updated_at?: string | null
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          brokerage_name: string | null
          can_switch_roles: boolean | null
          cover_photo_url: string | null
          created_at: string
          email: string
          full_name: string | null
          headline: string | null
          id: string
          is_platform_user: boolean | null
          license_number: string | null
          license_state: string | null
          onboarding_completed: boolean | null
          phone: string | null
          primary_role: Database["public"]["Enums"]["app_role"] | null
          service_areas: string[] | null
          specialties: string[] | null
          tenant_id: string
          title: string | null
          updated_at: string
          user_id: string
          website_url: string | null
          years_experience: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          brokerage_name?: string | null
          can_switch_roles?: boolean | null
          cover_photo_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          headline?: string | null
          id?: string
          is_platform_user?: boolean | null
          license_number?: string | null
          license_state?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          primary_role?: Database["public"]["Enums"]["app_role"] | null
          service_areas?: string[] | null
          specialties?: string[] | null
          tenant_id: string
          title?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
          years_experience?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          brokerage_name?: string | null
          can_switch_roles?: boolean | null
          cover_photo_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          headline?: string | null
          id?: string
          is_platform_user?: boolean | null
          license_number?: string | null
          license_state?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          primary_role?: Database["public"]["Enums"]["app_role"] | null
          service_areas?: string[] | null
          specialties?: string[] | null
          tenant_id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string
          address_id: string | null
          ai_description: string | null
          annual_taxes: number | null
          bathrooms: number | null
          bedrooms: number | null
          city: string
          cooling_type: string | null
          created_at: string
          days_on_market: number | null
          description: string | null
          elementary_school: string | null
          features: string[] | null
          heating_type: string | null
          high_school: string | null
          hoa_fee: number | null
          hoa_name: string | null
          id: string
          listing_agent_id: string | null
          listing_agent_name: string | null
          listing_agent_phone: string | null
          listing_date: string | null
          lot_size: number | null
          middle_school: string | null
          mls_number: string | null
          parking_spaces: number | null
          parking_type: string | null
          photos: string[] | null
          price: number | null
          property_type: string | null
          school_district: string | null
          seller_contact_id: string | null
          square_feet: number | null
          state: string
          status: string | null
          tax_assessment: number | null
          tenant_id: string
          updated_at: string
          year_built: number | null
          zip_code: string
        }
        Insert: {
          address: string
          address_id?: string | null
          ai_description?: string | null
          annual_taxes?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city: string
          cooling_type?: string | null
          created_at?: string
          days_on_market?: number | null
          description?: string | null
          elementary_school?: string | null
          features?: string[] | null
          heating_type?: string | null
          high_school?: string | null
          hoa_fee?: number | null
          hoa_name?: string | null
          id?: string
          listing_agent_id?: string | null
          listing_agent_name?: string | null
          listing_agent_phone?: string | null
          listing_date?: string | null
          lot_size?: number | null
          middle_school?: string | null
          mls_number?: string | null
          parking_spaces?: number | null
          parking_type?: string | null
          photos?: string[] | null
          price?: number | null
          property_type?: string | null
          school_district?: string | null
          seller_contact_id?: string | null
          square_feet?: number | null
          state: string
          status?: string | null
          tax_assessment?: number | null
          tenant_id: string
          updated_at?: string
          year_built?: number | null
          zip_code: string
        }
        Update: {
          address?: string
          address_id?: string | null
          ai_description?: string | null
          annual_taxes?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string
          cooling_type?: string | null
          created_at?: string
          days_on_market?: number | null
          description?: string | null
          elementary_school?: string | null
          features?: string[] | null
          heating_type?: string | null
          high_school?: string | null
          hoa_fee?: number | null
          hoa_name?: string | null
          id?: string
          listing_agent_id?: string | null
          listing_agent_name?: string | null
          listing_agent_phone?: string | null
          listing_date?: string | null
          lot_size?: number | null
          middle_school?: string | null
          mls_number?: string | null
          parking_spaces?: number | null
          parking_type?: string | null
          photos?: string[] | null
          price?: number | null
          property_type?: string | null
          school_district?: string | null
          seller_contact_id?: string | null
          square_feet?: number | null
          state?: string
          status?: string | null
          tax_assessment?: number | null
          tenant_id?: string
          updated_at?: string
          year_built?: number | null
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_seller_contact_id_fkey"
            columns: ["seller_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      property_searches: {
        Row: {
          created_at: string
          criteria: Json
          email_notifications: boolean
          id: string
          last_checked: string | null
          last_results: string[] | null
          notification_frequency: string
          search_name: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          criteria?: Json
          email_notifications?: boolean
          id?: string
          last_checked?: string | null
          last_results?: string[] | null
          notification_frequency?: string
          search_name: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          criteria?: Json
          email_notifications?: boolean
          id?: string
          last_checked?: string | null
          last_results?: string[] | null
          notification_frequency?: string
          search_name?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_searches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_properties: {
        Row: {
          created_at: string | null
          external_property_id: string | null
          id: string
          internal_property_id: string | null
          is_favorite: boolean | null
          notes: string | null
          property_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          external_property_id?: string | null
          id?: string
          internal_property_id?: string | null
          is_favorite?: boolean | null
          notes?: string | null
          property_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          external_property_id?: string | null
          id?: string
          internal_property_id?: string | null
          is_favorite?: boolean | null
          notes?: string | null
          property_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_properties_external_property_id_fkey"
            columns: ["external_property_id"]
            isOneToOne: false
            referencedRelation: "external_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_properties_internal_property_id_fkey"
            columns: ["internal_property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tenant_id: string
          trial_end: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id: string
          trial_end?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string
          trial_end?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      typing_indicators: {
        Row: {
          conversation_id: string
          id: string
          started_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          started_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_records: {
        Row: {
          id: string
          quantity: number | null
          record_type: string
          recorded_at: string
          tenant_id: string
        }
        Insert: {
          id?: string
          quantity?: number | null
          record_type: string
          recorded_at?: string
          tenant_id: string
        }
        Update: {
          id?: string
          quantity?: number | null
          record_type?: string
          recorded_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_agents: {
        Row: {
          activated_at: string
          agent_id: string
          id: string
          is_favorite: boolean | null
          user_id: string
        }
        Insert: {
          activated_at?: string
          agent_id: string
          id?: string
          is_favorite?: boolean | null
          user_id: string
        }
        Update: {
          activated_at?: string
          agent_id?: string
          id?: string
          is_favorite?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_agents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          created_at: string | null
          current_page: string | null
          id: string
          last_seen_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_page?: string | null
          id?: string
          last_seen_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_page?: string | null
          id?: string
          last_seen_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_and_increment_ai_usage: {
        Args: { p_tenant_id: string }
        Returns: {
          current_usage: number
          is_exceeded: boolean
          plan_name: string
          usage_limit: number
        }[]
      }
      cleanup_stale_typing_indicators: { Args: never; Returns: undefined }
      get_chunk_neighbors: {
        Args: { p_chunk_ids: string[]; p_tenant_id: string }
        Returns: {
          category: string
          chunk_id: string
          chunk_index: number
          content: string
          document_id: string
          document_name: string
          is_neighbor: boolean
        }[]
      }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      match_documents: {
        Args: {
          match_count: number
          match_threshold: number
          p_tenant_id: string
          query_embedding: string
        }
        Returns: {
          chunk_index: number
          content: string
          document_id: string
          document_name: string
          id: string
          similarity: number
        }[]
      }
      search_documents_hybrid: {
        Args: {
          p_document_ids: string[]
          p_limit?: number
          p_query: string
          p_tenant_id: string
        }
        Returns: {
          category: string
          chunk_id: string
          chunk_index: number
          content: string
          document_id: string
          document_name: string
          text_rank: number
        }[]
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "agent" | "buyer" | "seller"
      conversation_type: "direct" | "group"
      deal_stage_buyer:
        | "browsing"
        | "interested"
        | "touring"
        | "offer_prep"
        | "offer_submitted"
        | "negotiating"
        | "under_contract"
        | "inspection"
        | "appraisal"
        | "final_walkthrough"
        | "closing"
        | "closed"
        | "lost"
      deal_stage_seller:
        | "preparing"
        | "listed"
        | "showing"
        | "offer_received"
        | "negotiating"
        | "under_contract"
        | "inspection"
        | "appraisal"
        | "closing"
        | "closed"
        | "withdrawn"
      message_type: "text" | "file" | "system"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "admin", "agent", "buyer", "seller"],
      conversation_type: ["direct", "group"],
      deal_stage_buyer: [
        "browsing",
        "interested",
        "touring",
        "offer_prep",
        "offer_submitted",
        "negotiating",
        "under_contract",
        "inspection",
        "appraisal",
        "final_walkthrough",
        "closing",
        "closed",
        "lost",
      ],
      deal_stage_seller: [
        "preparing",
        "listed",
        "showing",
        "offer_received",
        "negotiating",
        "under_contract",
        "inspection",
        "appraisal",
        "closing",
        "closed",
        "withdrawn",
      ],
      message_type: ["text", "file", "system"],
    },
  },
} as const
