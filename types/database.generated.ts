export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      query_folders: {
        Row: {
          created_at: string
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_queries: {
        Row: {
          created_at: string
          definition: Json
          descricao: string
          folder_id: string | null
          id: string
          is_favorite: boolean
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          definition?: Json
          descricao?: string
          folder_id?: string | null
          id?: string
          is_favorite?: boolean
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          definition?: Json
          descricao?: string
          folder_id?: string | null
          id?: string
          is_favorite?: boolean
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_queries_folder_owner_fkey"
            columns: ["folder_id", "user_id"]
            isOneToOne: false
            referencedRelation: "query_folders"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      sprints: {
        Row: {
          created_at: string
          criterios_sucesso: string
          data_fim: string
          data_inicio: string
          id: string
          links: Json
          nome: string
          objetivo: string
          observacoes: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          criterios_sucesso?: string
          data_fim: string
          data_inicio: string
          id?: string
          links?: Json
          nome: string
          objetivo?: string
          observacoes?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          criterios_sucesso?: string
          data_fim?: string
          data_inicio?: string
          id?: string
          links?: Json
          nome?: string
          objetivo?: string
          observacoes?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tag_options: {
        Row: {
          cor: string
          created_at: string
          id: string
          nome: string
          tipo: string
          user_id: string
        }
        Insert: {
          cor?: string
          created_at?: string
          id?: string
          nome: string
          tipo: string
          user_id: string
        }
        Update: {
          cor?: string
          created_at?: string
          id?: string
          nome?: string
          tipo?: string
          user_id?: string
        }
        Relationships: []
      }
      task_environment_area_statuses: {
        Row: {
          area: string
          created_at: string
          environment_tag_id: string
          id: string
          status: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area: string
          created_at?: string
          environment_tag_id: string
          id?: string
          status: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: string
          created_at?: string
          environment_tag_id?: string
          id?: string
          status?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_environment_area_statuses_environment_owner_fkey"
            columns: ["environment_tag_id", "user_id"]
            isOneToOne: false
            referencedRelation: "tag_options"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "task_environment_area_statuses_task_owner_fkey"
            columns: ["task_id", "user_id"]
            isOneToOne: false
            referencedRelation: "task_statuses"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      task_environment_statuses: {
        Row: {
          available: boolean
          created_at: string
          environment_tag_id: string
          id: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          available?: boolean
          created_at?: string
          environment_tag_id: string
          id?: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          available?: boolean
          created_at?: string
          environment_tag_id?: string
          id?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_environment_statuses_environment_owner_fkey"
            columns: ["environment_tag_id", "user_id"]
            isOneToOne: false
            referencedRelation: "tag_options"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "task_environment_statuses_task_owner_fkey"
            columns: ["task_id", "user_id"]
            isOneToOne: false
            referencedRelation: "task_statuses"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      task_statuses: {
        Row: {
          ambiente: string
          areas: string[]
          azure: string
          azure_url: string
          created_at: string
          github_references: Json
          id: string
          is_future: boolean
          liveops_url: string
          nome: string
          sprint: string
          sprint_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          ambiente: string
          areas?: string[]
          azure?: string
          azure_url?: string
          created_at?: string
          github_references?: Json
          id?: string
          is_future?: boolean
          liveops_url?: string
          nome: string
          sprint?: string
          sprint_id?: string | null
          status: string
          user_id: string
        }
        Update: {
          ambiente?: string
          areas?: string[]
          azure?: string
          azure_url?: string
          created_at?: string
          github_references?: Json
          id?: string
          is_future?: boolean
          liveops_url?: string
          nome?: string
          sprint?: string
          sprint_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_statuses_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          cargo: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cargo?: string
          nome?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cargo?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

