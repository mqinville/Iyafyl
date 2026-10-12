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
      flock_creator_rankings: {
        Row: {
          creator: string
          list: string
          overall_rank: number | null
          overall_tier: number | null
          player_id: string
          positional_rank: number | null
          positional_tier: number | null
          updated_at: string
          weekly_overall_rank: number | null
          weekly_positional_rank: number | null
        }
        Insert: {
          creator: string
          list: string
          overall_rank?: number | null
          overall_tier?: number | null
          player_id: string
          positional_rank?: number | null
          positional_tier?: number | null
          updated_at?: string
          weekly_overall_rank?: number | null
          weekly_positional_rank?: number | null
        }
        Update: {
          creator?: string
          list?: string
          overall_rank?: number | null
          overall_tier?: number | null
          player_id?: string
          positional_rank?: number | null
          positional_tier?: number | null
          updated_at?: string
          weekly_overall_rank?: number | null
          weekly_positional_rank?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "flock_creator_rankings_list_player_id_fkey"
            columns: ["list", "player_id"]
            isOneToOne: false
            referencedRelation: "flock_rankings"
            referencedColumns: ["list", "player_id"]
          },
        ]
      }
      flock_ranking_sets: {
        Row: {
          creator_updated_at: Json | null
          creators: string[]
          expert_creators: string[] | null
          fetched_at: string
          list: string
          season: number | null
          subformat: string | null
          updated_at: string
        }
        Insert: {
          creator_updated_at?: Json | null
          creators: string[]
          expert_creators?: string[] | null
          fetched_at: string
          list: string
          season?: number | null
          subformat?: string | null
          updated_at?: string
        }
        Update: {
          creator_updated_at?: Json | null
          creators?: string[]
          expert_creators?: string[] | null
          fetched_at?: string
          list?: string
          season?: number | null
          subformat?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      flock_rankings: {
        Row: {
          average_positional_rank: number | null
          average_positional_tier: number | null
          average_rank: number | null
          average_tier: number | null
          average_weekly_positional_rank: number | null
          bye_week: number | null
          final_rank: number | null
          flock_player_id: string
          initial_rank: number | null
          is_special_teams: boolean
          list: string
          player_id: string
          rank_delta: number | null
          raw: Json
          updated_at: string
        }
        Insert: {
          average_positional_rank?: number | null
          average_positional_tier?: number | null
          average_rank?: number | null
          average_tier?: number | null
          average_weekly_positional_rank?: number | null
          bye_week?: number | null
          final_rank?: number | null
          flock_player_id: string
          initial_rank?: number | null
          is_special_teams?: boolean
          list: string
          player_id: string
          rank_delta?: number | null
          raw: Json
          updated_at?: string
        }
        Update: {
          average_positional_rank?: number | null
          average_positional_tier?: number | null
          average_rank?: number | null
          average_tier?: number | null
          average_weekly_positional_rank?: number | null
          bye_week?: number | null
          final_rank?: number | null
          flock_player_id?: string
          initial_rank?: number | null
          is_special_teams?: boolean
          list?: string
          player_id?: string
          rank_delta?: number | null
          raw?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flock_rankings_list_fkey"
            columns: ["list"]
            isOneToOne: false
            referencedRelation: "flock_ranking_sets"
            referencedColumns: ["list"]
          },
          {
            foreignKeyName: "flock_rankings_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["player_id"]
          },
        ]
      }
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
      normalize_player_name: { Args: { name: string }; Returns: string }
      player_rankings: {
        Args: {
          lim?: number
          off?: number
          p_active?: boolean
          p_dir?: string
          p_exclude_positions?: boolean
          p_flock_creator?: string
          p_flock_list?: string
          p_positions?: string[]
          p_ranked_only?: boolean
          p_search?: string
          p_season: number
          p_season_type?: string
          p_sort?: string
          p_week?: number
        }
        Returns: {
          active: boolean
          def_int: number
          def_td: number
          fga: number
          fgm: number
          first_name: string
          flock_pos_rank: number
          flock_rank: number
          flock_tier: number
          full_name: string
          fum_rec: number
          gp: number
          is_home: boolean
          last_name: string
          opponent: string
          pass_att: number
          pass_cmp: number
          pass_int: number
          pass_td: number
          pass_yd: number
          player_id: string
          position: string
          pts_allow: number
          pts_half_ppr: number
          pts_ppr: number
          pts_std: number
          rec: number
          rec_td: number
          rec_tgt: number
          rec_yd: number
          rush_att: number
          rush_td: number
          rush_yd: number
          sack: number
          team: string
          total_count: number
          week_team: string
          xpa: number
          xpm: number
        }[]
      }
      search_players: {
        Args: { lim?: number; q: string }
        Returns: {
          active: boolean
          full_name: string
          player_id: string
          position: string
          team: string
        }[]
      }
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

