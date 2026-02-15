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
      conversazioni: {
        Row: {
          id: string
          servizio_id: string | null
          ultimo_aggiornamento: string
          ultimo_messaggio: string | null
          utente1_id: string
          utente2_id: string
        }
        Insert: {
          id?: string
          servizio_id?: string | null
          ultimo_aggiornamento?: string
          ultimo_messaggio?: string | null
          utente1_id: string
          utente2_id: string
        }
        Update: {
          id?: string
          servizio_id?: string | null
          ultimo_aggiornamento?: string
          ultimo_messaggio?: string | null
          utente1_id?: string
          utente2_id?: string
        }
        Relationships: []
      }
      messaggi: {
        Row: {
          allegato_url: string | null
          conversazione_id: string
          created_at: string
          id: string
          letto: boolean
          mittente_id: string
          testo: string
        }
        Insert: {
          allegato_url?: string | null
          conversazione_id: string
          created_at?: string
          id?: string
          letto?: boolean
          mittente_id: string
          testo: string
        }
        Update: {
          allegato_url?: string | null
          conversazione_id?: string
          created_at?: string
          id?: string
          letto?: boolean
          mittente_id?: string
          testo?: string
        }
        Relationships: [
          {
            foreignKeyName: "messaggi_conversazione_id_fkey"
            columns: ["conversazione_id"]
            isOneToOne: false
            referencedRelation: "conversazioni"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cap: string | null
          citta: string | null
          civico: string | null
          cognome: string | null
          created_at: string
          data_nascita: string | null
          email: string | null
          email_verificata: boolean | null
          id: string
          indirizzo: string | null
          mostra_email: boolean | null
          mostra_telefono: boolean | null
          newsletter: boolean | null
          nome: string | null
          notifiche_email: boolean | null
          notifiche_push: boolean | null
          profilo_pubblico: boolean | null
          quartiere: string | null
          sesso: string | null
          telefono: string | null
          tipo_account: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          cap?: string | null
          citta?: string | null
          civico?: string | null
          cognome?: string | null
          created_at?: string
          data_nascita?: string | null
          email?: string | null
          email_verificata?: boolean | null
          id?: string
          indirizzo?: string | null
          mostra_email?: boolean | null
          mostra_telefono?: boolean | null
          newsletter?: boolean | null
          nome?: string | null
          notifiche_email?: boolean | null
          notifiche_push?: boolean | null
          profilo_pubblico?: boolean | null
          quartiere?: string | null
          sesso?: string | null
          telefono?: string | null
          tipo_account?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          cap?: string | null
          citta?: string | null
          civico?: string | null
          cognome?: string | null
          created_at?: string
          data_nascita?: string | null
          email?: string | null
          email_verificata?: boolean | null
          id?: string
          indirizzo?: string | null
          mostra_email?: boolean | null
          mostra_telefono?: boolean | null
          newsletter?: boolean | null
          nome?: string | null
          notifiche_email?: boolean | null
          notifiche_push?: boolean | null
          profilo_pubblico?: boolean | null
          quartiere?: string | null
          sesso?: string | null
          telefono?: string | null
          tipo_account?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
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
    Enums: {},
  },
} as const
