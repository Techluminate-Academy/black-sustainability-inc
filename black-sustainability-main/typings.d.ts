import { UserObject } from '@/typings';
// here i willl create type for the expected array of usere

type PhotoThumbnail = {
  url?: string;
  width?: number;
  height?: number;
};

type Photo = {
  id?: string;
  width?: number;
  height?: number;
  url?: string;
  filename?: string;
  size?: number;
  type?: string;
  thumbnails?: {
    small?: PhotoThumbnail;
    large?: PhotoThumbnail;
    full?: PhotoThumbnail;
  };
};

type Attachment = {
  id?: string;
  width?: number;
  height?: number;
  url?: string;
  filename?: string;
  size?: number;
  type?: string;
  thumbnails?: {
    small?: PhotoThumbnail;
    large?: PhotoThumbnail;
    full?: PhotoThumbnail;
  };
};

type CreatedBy = {
  id?: string;
  email?: string;
  name?: string;
};

type Fields = {
  "EMAIL ADDRESS"?: string;
  BIO?: string;
  PHOTO?: Photo[];
  PHONE?: string;
  IDENTIFICATION?: string;
  "FIRST NAME"?: string;
  "LAST NAME"?: string;
  "PRIMARY INDUSTRY HOUSE"?: string;
  WEBSITE?: string;
  GENDER?: string;
  Country?: string[];
  "State/Province"?: string;
  "Location (Nearest City)"?: string;
  "Name (from Location)"?: string;
  "WELCOMED?"?: boolean;
  "ORGANIZATION NAME"?: string;
  "MEMBER LEVEL"?: string[];
  "Send Welcome Email"?: boolean;
  State?: string;
  "State New"?: string[];
  "SMS Status"?: string;
  "SMS Content"?: string;
  "Equity Member (keep current)"?: boolean;
  Latitude?: string;
  Longitude?: string;
  "In Mighty Network"?: boolean;
  "Attachments (from MEMBER LEVEL)"?: Attachment[];
  "Created By"?: CreatedBy;
  "FULL NAME"?: string;
  Created?: string;
  "Annual Profile Update Automation"?: string;
  userphoto?: string;
};

export interface UserObject {
  id?: string;
  createdTime?: string;
  fields?: Fields;
}

export interface Person {
  name: string;
  age: number;
  email: string;
}

export type PeopleArray = Person[];
export type BsiUserObjectArray = UserObject[];
