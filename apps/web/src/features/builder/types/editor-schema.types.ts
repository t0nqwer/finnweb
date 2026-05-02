export type EditorSchemaFieldType =
  | "text"
  | "textarea"
  | "url"
  | "image"
  | "color"
  | "select"
  | "switch";

export type EditorSchemaOption = {
  label: string;
  value: string;
};

export type EditorSchemaField = {
  key: string;
  label: string;
  type: EditorSchemaFieldType;
  placeholder?: string;
  options?: EditorSchemaOption[];
  required?: boolean;
};

export type EditorSchema = EditorSchemaField[];

export type EditorFieldValue = string | boolean;
