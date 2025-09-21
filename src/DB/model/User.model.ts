import { model, models, Schema, Types, HydratedDocument } from "mongoose";
import { generateHash } from "../../utils/security/hash.security";
import { emailEvent } from "../../utils/event/email.event";

export enum GenderEnum {
    male = "male",
    female = "female",
}

export enum RoleEnum {
    user = "user",
    admin = "admin",
    superAdmin = "super-admin",
}

export enum ProviderEnum {
    GOOGLE = "GOOGLE",
    SYSTEM = "SYSTEM",
}

export interface IUser {
    _id: Types.ObjectId;

    firstName: string;
    lastName: string;
    username?: string;

    email: string;
    confirmEmailOtp?: string;
    confirmedAt?: Date;

    password: string;
    resetPasswordOtp?: string;
    changeCredentialsTime?: Date;

    phone?: string;
    address?: string;

    profileImage?: string;
    temprofileImage?: string;
    coverImage?: string[];

    gender: GenderEnum;
    role: RoleEnum;

    provider: ProviderEnum;

    freezedAt?: Date;
    freezedBy?: Types.ObjectId;
    restoredAt?: Date;
    restoredBy?: Types.ObjectId;

    updatedAt?: Date;
    createdAt: Date;

    friends?: Types.ObjectId[];

}

const userSchema = new Schema<IUser>({

    firstName: { type: String, required: true, minLength: 2, maxLength: 25 },
    lastName: { type: String, required: true, minLength: 2, maxLength: 25 },

    email: { type: String, required: true, unique: true },
    confirmEmailOtp: { type: String },
    confirmedAt: { type: Date },

    password: {
        type: String, required: function () {
            return this.provider === ProviderEnum.GOOGLE ? false : true;
        },
    },
    resetPasswordOtp: { type: String },
    changeCredentialsTime: { type: Date },

    phone: { type: String },
    address: { type: String },

    profileImage: { type: String },
    temprofileImage: { type: String },
    coverImage: [String],

    gender: { type: String, enum: GenderEnum, default: GenderEnum.male },
    role: { type: String, enum: RoleEnum, default: RoleEnum.user },

    provider: { type: String, enum: ProviderEnum, default: ProviderEnum.SYSTEM },

    freezedAt: Date,
    freezedBy: { type: Schema.Types.ObjectId, ref: "User" },
    restoredAt: Date,
    restoredBy: { type: Schema.Types.ObjectId, ref: "User" },

    friends: [{ type: Schema.Types.ObjectId, ref: "User" }],

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

userSchema.virtual("username").set(function (value: string) {
    const [firstName, lastName] = value.split(" ") || [];
    this.set({ firstName, lastName, slug: value.replaceAll(/\s+/g, "-") });
}).get(function () {
    return this.firstName + " " + this.lastName;
});

userSchema.pre("save", async function (this: HUserDocument & { wasNew: boolean; confirmEmailPlainOtp?: string }, next) {

    this.wasNew = this.isNew;
    if (this.isModified("password")) {
        this.password = await generateHash(this.password);
    }
    if (this.isModified("confirmEmailOtp")) {
        this.confirmEmailPlainOtp = this.confirmEmailOtp as string;
        this.confirmEmailOtp = await generateHash(this.confirmEmailOtp as string);
    }

    next()

});

userSchema.post("save", async function (doc, next) {
    const that = this as HUserDocument & {
        wasNew: boolean;
        confirmEmailPlainOtp?: string;
    };
    if (that.wasNew && that.confirmEmailPlainOtp) {
        emailEvent.emit("confirmEmail", {
            to: this.email,
            otp: that.confirmEmailPlainOtp,
        })
    }
    next()
})

userSchema.pre(["find", "findOne"], function (next) {
    const query = this.getQuery();
    if (query.paranoid === false) {
        this.setQuery({ ...query });
    } else {
        this.setQuery({ ...query, freezedAt: { $exists: false } });
    }
    next()
})

export const UserModel = models.User || model<IUser>("User", userSchema);
export type HUserDocument = HydratedDocument<IUser>