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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      experiments: {
        Row: {
          created_at: string
          error_message: string | null
          fal_request_id: string | null
          id: string
          input_url: string | null
          product_id: string
          result_url: string | null
          status: string
          store_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          fal_request_id?: string | null
          id?: string
          input_url?: string | null
          product_id: string
          result_url?: string | null
          status?: string
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          fal_request_id?: string | null
          id?: string
          input_url?: string | null
          product_id?: string
          result_url?: string | null
          status?: string
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experiments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          buy_url: string | null
          created_at: string
          display_name: string
          id: string
          image_url: string | null
          option_kind: string
          price: number | null
          product_id: string
          sizes: Json
          sku: string | null
          sort_order: number
          source_option_name: string | null
          source_option_value: string | null
          updated_at: string
        }
        Insert: {
          buy_url?: string | null
          created_at?: string
          display_name: string
          id?: string
          image_url?: string | null
          option_kind?: string
          price?: number | null
          product_id: string
          sizes?: Json
          sku?: string | null
          sort_order?: number
          source_option_name?: string | null
          source_option_value?: string | null
          updated_at?: string
        }
        Update: {
          buy_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          image_url?: string | null
          option_kind?: string
          price?: number | null
          product_id?: string
          sizes?: Json
          sku?: string | null
          sort_order?: number
          source_option_name?: string | null
          source_option_value?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          buy_url: string | null
          categoria: string
          created_at: string
          descricao: string | null
          id: string
          imagem: string | null
          nome: string
          preco: number
          sku: string | null
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          buy_url?: string | null
          categoria?: string
          created_at?: string
          descricao?: string | null
          id?: string
          imagem?: string | null
          nome: string
          preco?: number
          sku?: string | null
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          buy_url?: string | null
          categoria?: string
          created_at?: string
          descricao?: string | null
          id?: string
          imagem?: string | null
          nome?: string
          preco?: number
          sku?: string | null
          status?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      qrcodes: {
        Row: {
          created_at: string
          id: string
          product_id: string
          token: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          token: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "qrcodes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          cor: string
          created_at: string
          ecommerce_enabled: boolean
          endereco: string | null
          id: string
          instagram: string | null
          logo: string | null
          nome: string
          owner_id: string
          physical_enabled: boolean
          updated_at: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          cor?: string
          created_at?: string
          ecommerce_enabled?: boolean
          endereco?: string | null
          id?: string
          instagram?: string | null
          logo?: string | null
          nome?: string
          owner_id: string
          physical_enabled?: boolean
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          cor?: string
          created_at?: string
          ecommerce_enabled?: boolean
          endereco?: string | null
          id?: string
          instagram?: string | null
          logo?: string | null
          nome?: string
          owner_id?: string
          physical_enabled?: boolean
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_store_id: { Args: never; Returns: string }
      get_product_by_token: {
        Args: { _token: string }
        Returns: {
          buy_url: string
          categoria: string
          created_at: string
          descricao: string
          id: string
          imagem: string
          nome: string
          preco: number
          sku: string
          status: string
          store_id: string
          updated_at: string
        }[]
      }
      get_variants_by_token: {
        Args: { _token: string }
        Returns: {
          buy_url: string
          display_name: string
          id: string
          image_url: string
          option_kind: string
          price: number
          product_id: string
          sizes: Json
          sku: string
          sort_order: number
        }[]
      }
      owns_product: { Args: { _product_id: string }; Returns: boolean }
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
