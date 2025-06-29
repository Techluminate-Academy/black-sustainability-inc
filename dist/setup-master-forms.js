"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var mongodb_1 = require("../lib/mongodb");
function setupMasterForms() {
    return __awaiter(this, void 0, void 0, function () {
        var db, formVersions, freeSignupForm, upgradeForm, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, mongodb_1.connectToDatabase)()];
                case 1:
                    db = (_a.sent()).db;
                    formVersions = db.collection('formVersions');
                    freeSignupForm = {
                        version: 1000, // Using 1000 as base version for master configs
                        fields: [
                            {
                                id: 'firstName',
                                name: 'firstName',
                                label: 'First Name',
                                type: 'text',
                                required: true,
                                step: 1,
                                placeholder: 'Enter your first name'
                            },
                            {
                                id: 'lastName',
                                name: 'lastName',
                                label: 'Last Name',
                                type: 'text',
                                required: true,
                                step: 1,
                                placeholder: 'Enter your last name'
                            },
                            {
                                id: 'email',
                                name: 'email',
                                label: 'Email Address',
                                type: 'email',
                                required: true,
                                step: 1,
                                placeholder: 'Enter your email address'
                            },
                            {
                                id: 'address',
                                name: 'address',
                                label: 'Address',
                                type: 'address',
                                required: true,
                                step: 1,
                                placeholder: 'Enter your address'
                            },
                            {
                                id: 'primaryIndustry',
                                name: 'primaryIndustry',
                                label: 'Primary Industry',
                                type: 'dropdown',
                                required: true,
                                step: 2,
                                options: [
                                    { label: 'Agriculture', value: 'agriculture' },
                                    { label: 'Alternative Energy', value: 'alternative_energy' },
                                    { label: 'Community Development', value: 'community_development' },
                                    { label: 'Education', value: 'education' },
                                    { label: 'Green Building', value: 'green_building' },
                                    { label: 'Waste Management', value: 'waste_management' },
                                    { label: 'Water', value: 'water' },
                                    { label: 'Wholistic', value: 'wholistic' }
                                ]
                            },
                            {
                                id: 'organizationName',
                                name: 'organizationName',
                                label: 'Organization Name',
                                type: 'text',
                                required: false,
                                step: 2,
                                placeholder: 'Enter your organization name'
                            },
                            {
                                id: 'bio',
                                name: 'bio',
                                label: 'Bio',
                                type: 'textarea',
                                required: false,
                                step: 2,
                                placeholder: 'Tell us about yourself or your organization'
                            },
                            {
                                id: 'photo',
                                name: 'photo',
                                label: 'Profile Photo',
                                type: 'file',
                                required: false,
                                step: 3
                            },
                            {
                                id: 'logo',
                                name: 'logo',
                                label: 'Organization Logo',
                                type: 'file',
                                required: false,
                                step: 3
                            }
                        ],
                        status: 'published',
                        updatedAt: new Date().toISOString()
                    };
                    upgradeForm = {
                        version: 1001, // Using 1001 for upgrade form
                        fields: [
                            // Basic info from free signup
                            {
                                id: 'email',
                                name: 'email',
                                label: 'Email Address',
                                type: 'email',
                                required: true,
                                step: 1,
                                placeholder: 'Enter your email address'
                            },
                            {
                                id: 'firstName',
                                name: 'firstName',
                                label: 'First Name',
                                type: 'text',
                                required: true,
                                step: 1,
                                placeholder: 'Enter your first name'
                            },
                            {
                                id: 'lastName',
                                name: 'lastName',
                                label: 'Last Name',
                                type: 'text',
                                required: true,
                                step: 1,
                                placeholder: 'Enter your last name'
                            },
                            // Additional fields for paid membership
                            {
                                id: 'memberLevel',
                                name: 'memberLevel',
                                label: 'Membership Level',
                                type: 'dropdown',
                                required: true,
                                step: 1,
                                options: [
                                    { label: 'Individual', value: 'individual' },
                                    { label: 'Organization', value: 'organization' },
                                    { label: 'Corporate', value: 'corporate' }
                                ]
                            },
                            {
                                id: 'affiliatedEntity',
                                name: 'affiliatedEntity',
                                label: 'Affiliated Entity',
                                type: 'text',
                                required: true,
                                step: 1,
                                placeholder: 'Enter your affiliated entity'
                            },
                            {
                                id: 'identification',
                                name: 'identification',
                                label: 'Identification',
                                type: 'text',
                                required: true,
                                step: 1
                            },
                            {
                                id: 'gender',
                                name: 'gender',
                                label: 'Gender',
                                type: 'dropdown',
                                required: true,
                                step: 1,
                                options: [
                                    { label: 'Male', value: 'male' },
                                    { label: 'Female', value: 'female' },
                                    { label: 'Non-binary', value: 'non-binary' },
                                    { label: 'Prefer not to say', value: 'prefer_not_to_say' }
                                ]
                            },
                            {
                                id: 'website',
                                name: 'website',
                                label: 'Website',
                                type: 'url',
                                required: false,
                                step: 2,
                                placeholder: 'Enter your website URL'
                            },
                            {
                                id: 'phone',
                                name: 'phone',
                                label: 'Phone Number',
                                type: 'phone',
                                required: true,
                                step: 2
                            },
                            {
                                id: 'additionalFocus',
                                name: 'additionalFocus',
                                label: 'Additional Focus Areas',
                                type: 'dropdown',
                                required: false,
                                step: 2,
                                options: [
                                    { label: 'Agriculture', value: 'agriculture' },
                                    { label: 'Alternative Energy', value: 'alternative_energy' },
                                    { label: 'Community Development', value: 'community_development' },
                                    { label: 'Education', value: 'education' },
                                    { label: 'Green Building', value: 'green_building' },
                                    { label: 'Waste Management', value: 'waste_management' },
                                    { label: 'Water', value: 'water' },
                                    { label: 'Wholistic', value: 'wholistic' }
                                ]
                            },
                            {
                                id: 'zipCode',
                                name: 'zipCode',
                                label: 'ZIP Code',
                                type: 'text',
                                required: true,
                                step: 2,
                                placeholder: 'Enter your ZIP code'
                            },
                            {
                                id: 'youtube',
                                name: 'youtube',
                                label: 'YouTube Channel',
                                type: 'url',
                                required: false,
                                step: 3,
                                placeholder: 'Enter your YouTube channel URL'
                            },
                            {
                                id: 'nearestCity',
                                name: 'nearestCity',
                                label: 'Nearest City',
                                type: 'text',
                                required: true,
                                step: 3
                            },
                            {
                                id: 'fundingGoal',
                                name: 'fundingGoal',
                                label: 'Funding Goal',
                                type: 'text',
                                required: false,
                                step: 3,
                                placeholder: 'Enter your funding goal'
                            },
                            {
                                id: 'naicsCode',
                                name: 'naicsCode',
                                label: 'NAICS Code',
                                type: 'text',
                                required: false,
                                step: 3,
                                placeholder: 'Enter your NAICS code'
                            },
                            {
                                id: 'includeOnMap',
                                name: 'includeOnMap',
                                label: 'Include on Map',
                                type: 'checkbox',
                                required: false,
                                step: 3
                            }
                        ],
                        status: 'published',
                        updatedAt: new Date().toISOString()
                    };
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 5, , 6]);
                    // Remove existing master forms if they exist
                    return [4 /*yield*/, formVersions.deleteMany({ version: { $in: [1000, 1001] } })];
                case 3:
                    // Remove existing master forms if they exist
                    _a.sent();
                    // Insert new master forms
                    return [4 /*yield*/, formVersions.insertMany([freeSignupForm, upgradeForm])];
                case 4:
                    // Insert new master forms
                    _a.sent();
                    console.log('Successfully created master form configurations:');
                    console.log('- Free Signup Form (version 1000)');
                    console.log('- Upgrade Form (version 1001)');
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _a.sent();
                    console.error('Error setting up master forms:', error_1);
                    process.exit(1);
                    return [3 /*break*/, 6];
                case 6:
                    process.exit(0);
                    return [2 /*return*/];
            }
        });
    });
}
setupMasterForms().catch(console.error);
