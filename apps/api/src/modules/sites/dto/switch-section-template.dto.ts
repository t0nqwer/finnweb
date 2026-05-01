import { IsNotEmpty, IsString } from "class-validator";

export class SwitchSectionTemplateDto {
  @IsString()
  @IsNotEmpty()
  sectionTemplateId!: string;
}

