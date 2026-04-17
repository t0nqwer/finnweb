import { IsArray, IsString } from "class-validator";

export class ReorderSectionsDto {
  @IsArray()
  @IsString({ each: true })
  sectionIds!: string[];
}
