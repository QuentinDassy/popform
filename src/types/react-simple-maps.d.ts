declare module "react-simple-maps" {
  import { ComponentType, ReactNode, SVGProps } from "react";

  interface ProjectionConfig {
    center?: [number, number];
    scale?: number;
    rotate?: [number, number, number];
    parallels?: [number, number];
  }

  interface ComposableMapProps extends SVGProps<SVGSVGElement> {
    projection?: string;
    projectionConfig?: ProjectionConfig;
    width?: number;
    height?: number;
  }

  interface GeographiesProps {
    geography: string | object;
    children: (args: { geographies: GeoFeature[] }) => ReactNode;
    [key: string]: unknown;
  }

  interface GeoFeature {
    rsmKey: string;
    properties: Record<string, string>;
    [key: string]: unknown;
  }

  interface GeographyStyle {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    outline?: string;
    cursor?: string;
    transition?: string;
  }

  interface GeographyProps {
    geography: GeoFeature;
    style?: { default?: GeographyStyle; hover?: GeographyStyle; pressed?: GeographyStyle };
    onMouseEnter?: (e: React.MouseEvent) => void;
    onMouseLeave?: (e: React.MouseEvent) => void;
    onClick?: (e: React.MouseEvent) => void;
    [key: string]: unknown;
  }

  export const ComposableMap: ComponentType<ComposableMapProps>;
  export const Geographies: ComponentType<GeographiesProps>;
  export const Geography: ComponentType<GeographyProps>;
  export const Marker: ComponentType<{ coordinates: [number, number]; children?: ReactNode; [key: string]: unknown }>;
  export const Annotation: ComponentType<{ subject: [number, number]; children?: ReactNode; [key: string]: unknown }>;
}
