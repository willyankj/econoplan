import { 
  Tag, ShoppingBag, ShoppingCart, Utensils, Car, Bus, Plane, 
  Home, Zap, Droplets, Wifi, Phone, Stethoscope, Heart, Pill,
  GraduationCap, Book, Briefcase, DollarSign, PiggyBank, TrendingUp, 
  Gift, Gamepad2, Music, Tv, Coffee, Baby, PawPrint, Wrench,
  LucideIcon
} from "lucide-react";

// Mapa centralizado de ícones permitidos no sistema
export const ICON_MAP: Record<string, LucideIcon> = {
  "Tag": Tag,
  "ShoppingBag": ShoppingBag,
  "ShoppingCart": ShoppingCart,
  "Utensils": Utensils,
  "Car": Car,
  "Bus": Bus,
  "Plane": Plane,
  "Home": Home,
  "Zap": Zap,
  "Droplets": Droplets,
  "Wifi": Wifi,
  "Phone": Phone,
  "Stethoscope": Stethoscope,
  "Heart": Heart,
  "Pill": Pill,
  "GraduationCap": GraduationCap,
  "Book": Book,
  "Briefcase": Briefcase,
  "DollarSign": DollarSign,
  "PiggyBank": PiggyBank,
  "TrendingUp": TrendingUp,
  "Gift": Gift,
  "Gamepad2": Gamepad2,
  "Music": Music,
  "Tv": Tv,
  "Coffee": Coffee,
  "Baby": Baby,
  "PawPrint": PawPrint,
  "Wrench": Wrench
};

// Lista de nomes para iteração (usada no picker)
export const AVAILABLE_ICONS = Object.keys(ICON_MAP);

/**
 * Retorna o componente do ícone de forma segura.
 * Se o nome não existir, retorna o ícone padrão (Tag).
 */
export function getIcon(name: string | null | undefined) {
  if (!name) return ICON_MAP["Tag"];
  return ICON_MAP[name] || ICON_MAP["Tag"];
}
