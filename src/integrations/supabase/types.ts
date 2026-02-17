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
      activity_logs: {
        Row: {
          azione: string
          created_at: string
          dettagli: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          azione: string
          created_at?: string
          dettagli?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          azione?: string
          created_at?: string
          dettagli?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      annunci: {
        Row: {
          categoria_id: string | null
          created_at: string
          descrizione: string | null
          id: string
          immagini: string[] | null
          moderato_da: string | null
          moderato_il: string | null
          motivo_rifiuto: string | null
          prezzo: number | null
          quartiere: string | null
          stato: string
          titolo: string
          updated_at: string
          user_id: string
          visualizzazioni: number
        }
        Insert: {
          categoria_id?: string | null
          created_at?: string
          descrizione?: string | null
          id?: string
          immagini?: string[] | null
          moderato_da?: string | null
          moderato_il?: string | null
          motivo_rifiuto?: string | null
          prezzo?: number | null
          quartiere?: string | null
          stato?: string
          titolo: string
          updated_at?: string
          user_id: string
          visualizzazioni?: number
        }
        Update: {
          categoria_id?: string | null
          created_at?: string
          descrizione?: string | null
          id?: string
          immagini?: string[] | null
          moderato_da?: string | null
          moderato_il?: string | null
          motivo_rifiuto?: string | null
          prezzo?: number | null
          quartiere?: string | null
          stato?: string
          titolo?: string
          updated_at?: string
          user_id?: string
          visualizzazioni?: number
        }
        Relationships: [
          {
            foreignKeyName: "annunci_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorie_annunci"
            referencedColumns: ["id"]
          },
        ]
      }
      categorie: {
        Row: {
          attiva: boolean
          created_at: string
          icona: string
          id: string
          nome: string
          ordine: number
          updated_at: string
        }
        Insert: {
          attiva?: boolean
          created_at?: string
          icona?: string
          id?: string
          nome: string
          ordine?: number
          updated_at?: string
        }
        Update: {
          attiva?: boolean
          created_at?: string
          icona?: string
          id?: string
          nome?: string
          ordine?: number
          updated_at?: string
        }
        Relationships: []
      }
      categorie_annunci: {
        Row: {
          created_at: string
          icona: string
          id: string
          label: string
          nome: string
          ordine: number
          richiede_prezzo: boolean
        }
        Insert: {
          created_at?: string
          icona?: string
          id?: string
          label: string
          nome: string
          ordine?: number
          richiede_prezzo?: boolean
        }
        Update: {
          created_at?: string
          icona?: string
          id?: string
          label?: string
          nome?: string
          ordine?: number
          richiede_prezzo?: boolean
        }
        Relationships: []
      }
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
      prenotazioni: {
        Row: {
          created_at: string
          data_prenotazione: string
          id: string
          note: string | null
          servizio_id: string
          stato: string
          updated_at: string
          utente_id: string
        }
        Insert: {
          created_at?: string
          data_prenotazione?: string
          id?: string
          note?: string | null
          servizio_id: string
          stato?: string
          updated_at?: string
          utente_id: string
        }
        Update: {
          created_at?: string
          data_prenotazione?: string
          id?: string
          note?: string | null
          servizio_id?: string
          stato?: string
          updated_at?: string
          utente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prenotazioni_servizio_id_fkey"
            columns: ["servizio_id"]
            isOneToOne: false
            referencedRelation: "servizi"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bloccato: boolean | null
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
          bloccato?: boolean | null
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
          bloccato?: boolean | null
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
      segnalazioni: {
        Row: {
          annuncio_id: string
          created_at: string
          gestita_da: string | null
          id: string
          motivo: string
          note: string | null
          stato: string
          utente_id: string
        }
        Insert: {
          annuncio_id: string
          created_at?: string
          gestita_da?: string | null
          id?: string
          motivo: string
          note?: string | null
          stato?: string
          utente_id: string
        }
        Update: {
          annuncio_id?: string
          created_at?: string
          gestita_da?: string | null
          id?: string
          motivo?: string
          note?: string | null
          stato?: string
          utente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "segnalazioni_annuncio_id_fkey"
            columns: ["annuncio_id"]
            isOneToOne: false
            referencedRelation: "annunci"
            referencedColumns: ["id"]
          },
        ]
      }
      servizi: {
        Row: {
          categoria_id: string | null
          created_at: string
          descrizione: string | null
          id: string
          operatore_id: string
          stato: string
          titolo: string
          updated_at: string
        }
        Insert: {
          categoria_id?: string | null
          created_at?: string
          descrizione?: string | null
          id?: string
          operatore_id: string
          stato?: string
          titolo: string
          updated_at?: string
        }
        Update: {
          categoria_id?: string | null
          created_at?: string
          descrizione?: string | null
          id?: string
          operatore_id?: string
          stato?: string
          titolo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "servizi_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorie"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
