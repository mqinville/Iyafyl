export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      nfl_games: {
        Row: {
          away: string
          game_date: string | null
          game_id: string
          home: string
          season: number
          season_type: string
          status: string | null
          updated_at: string
          week: number
        }
        Insert: {
          away: string
          game_date?: string | null
          game_id: string
          home: string
          season: number
          season_type: string
          status?: string | null
          updated_at?: string
          week: number
        }
        Update: {
          away?: string
          game_date?: string | null
          game_id?: string
          home?: string
          season?: number
          season_type?: string
          status?: string | null
          updated_at?: string
          week?: number
        }
        Relationships: []
      }
      player_week_stats: {
        Row: {
          game_date: string | null
          game_id: string | null
          opponent: string | null
          participation: string
          player_id: string
          pts_half_ppr: number | null
          pts_ppr: number | null
          pts_std: number | null
          season: number
          season_type: string
          stats: Json | null
          team: string
          team_inferred: boolean
          updated_at: string
          week: number
        }
        Insert: {
          game_date?: string | null
          game_id?: string | null
          opponent?: string | null
          participation: string
          player_id: string
          pts_half_ppr?: number | null
          pts_ppr?: number | null
          pts_std?: number | null
          season: number
          season_type: string
          stats?: Json | null
          team: string
          team_inferred?: boolean
          updated_at?: string
          week: number
        }
        Update: {
          game_date?: string | null
          game_id?: string | null
          opponent?: string | null
          participation?: string
          player_id?: string
          pts_half_ppr?: number | null
          pts_ppr?: number | null
          pts_std?: number | null
          season?: number
          season_type?: string
          stats?: Json | null
          team?: string
          team_inferred?: boolean
          updated_at?: string
          week?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_week_stats_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "nfl_games"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "player_week_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["player_id"]
          },
        ]
      }
      players: {
        Row: {
          active: boolean
          birth_date: string | null
          college: string | null
          created_at: string
          espn_id: string | null
          fantasy_positions: string[] | null
          first_name: string | null
          full_name: string
          gsis_id: string | null
          height_in: number | null
          injury_status: string | null
          jersey_number: number | null
          last_name: string | null
          player_id: string
          position: string | null
          raw: Json
          sportradar_id: string | null
          status: string | null
          team: string | null
          updated_at: string
          weight_lb: number | null
          yahoo_id: string | null
          years_exp: number | null
        }
        Insert: {
          active: boolean
          birth_date?: string | null
          college?: string | null
          created_at?: string
          espn_id?: string | null
          fantasy_positions?: string[] | null
          first_name?: string | null
          full_name: string
          gsis_id?: string | null
          height_in?: number | null
          injury_status?: string | null
          jersey_number?: number | null
          last_name?: string | null
          player_id: string
          position?: string | null
          raw: Json
          sportradar_id?: string | null
          status?: string | null
          team?: string | null
          updated_at?: string
          weight_lb?: number | null
          yahoo_id?: string | null
          years_exp?: number | null
        }
        Update: {
          active?: boolean
          birth_date?: string | null
          college?: string | null
          created_at?: string
          espn_id?: string | null
          fantasy_positions?: string[] | null
          first_name?: string | null
          full_name?: string
          gsis_id?: string | null
          height_in?: number | null
          injury_status?: string | null
          jersey_number?: number | null
          last_name?: string | null
          player_id?: string
          position?: string | null
          raw?: Json
          sportradar_id?: string | null
          status?: string | null
          team?: string | null
          updated_at?: string
          weight_lb?: number | null
          yahoo_id?: string | null
          years_exp?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          sleeper_user_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          sleeper_user_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          sleeper_user_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sync_runs: {
        Row: {
          args: Json
          error: string | null
          finished_at: string | null
          id: number
          job: string
          rows_written: number
          started_at: string
          status: string
        }
        Insert: {
          args?: Json
          error?: string | null
          finished_at?: string | null
          id?: never
          job: string
          rows_written?: number
          started_at?: string
          status: string
        }
        Update: {
          args?: Json
          error?: string | null
          finished_at?: string | null
          id?: never
          job?: string
          rows_written?: number
          started_at?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      player_season_totals: {
        Row: {
          games_played: number | null
          player_id: string | null
          pts_half_ppr: number | null
          pts_ppr: number | null
          pts_std: number | null
          season: number | null
          season_type: string | null
          weeks_bye: number | null
          weeks_inactive: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_week_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["player_id"]
          },
        ]
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

