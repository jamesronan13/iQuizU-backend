import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Loader2, CircleUserRound, KeyRound } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../firebase/firebaseConfig";

export default function TeacherProfile({ user, userDoc }) {
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [sendingPasswordReset, setSendingPasswordReset] = useState(false);

    // form state (initialized from user / userDoc)
    const [fullName, setFullName] = useState("");
    const [department, setDepartment] = useState("");
    const [emailAddr, setEmailAddr] = useState("");
    const [phone, setPhone] = useState("");
    const [bio, setBio] = useState("");

    // readonly info
    const displayName = userDoc?.firstName || user?.displayName || "Teacher";
    const userInitial = (displayName && displayName.charAt(0).toUpperCase()) || "T";

    useEffect(() => {
        // initialize form fields from incoming props
        setFullName(userDoc?.firstName || user?.displayName || "");
        setDepartment(userDoc?.department || "");
        setEmailAddr(userDoc?.email || user?.email || "");
        setPhone(userDoc?.phone || "");
        setBio(userDoc?.bio || "");
        setLoading(false);
    }, [user, userDoc]);

    // Handle password reset email
    const handleChangePassword = async () => {
        const email = user?.email || emailAddr;
        
        if (!email) {
            alert('❌ No email address found. Please add an email to your profile first.');
            return;
        }

        const confirmSend = window.confirm(
            `A password reset link will be sent to:\n${email}\n\nDo you want to continue?`
        );

        if (!confirmSend) return;

        try {
            setSendingPasswordReset(true);
            
            await sendPasswordResetEmail(auth, email);
            
            alert(`✅ Password reset email sent to ${email}\n\nPlease check your inbox and spam folder. Click the link in the email to reset your password.`);
        } catch (error) {
            console.error("Error sending password reset email:", error);
            
            let errorMsg = 'Failed to send password reset email. ';
            if (error.code === 'auth/user-not-found') {
                errorMsg += 'No account found with this email.';
            } else if (error.code === 'auth/invalid-email') {
                errorMsg += 'Invalid email address.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMsg += 'Too many requests. Please try again later.';
            } else {
                errorMsg += error.message;
            }
            
            alert(errorMsg);
        } finally {
            setSendingPasswordReset(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center font-Outfit">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <span className="ml-3 text-subtext">Loading…</span>
            </div>
        );
    }

    return (
        <div className="py-6 px-2 md:p-8 font-Outfit">
            <div className="flex flex-row gap-3 items-center ">
                <CircleUserRound className="w-8 h-8 text-accent mb-6" />
                <div className="flex flex-col mb-6">
                    <h2 className="text-2xl font-bold text-title flex items-center gap-2">
                        Profile
                    </h2>
                    <p className="text-md font-light text-subtext">
                        Your personal teaching profile and academic details.
                    </p>
                </div>
            </div>
            <div className="flex md:grid-cols-2 gap-6 mt-2">
                <div className="bg-components p-6 rounded-2xl shadow-md w-full">
                    <h2 className="text-xl md:text-2xl text-title font-semibold">User Information</h2>
                    {editing ? (
                        <div className="mt-4 space-y-4">
                            <div className="flex flex-row gap-4 mt-4 items-center">
                                <label className="w-36 text-subtext">Full Name:</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="border p-1 rounded-xl w-full"
                                />
                            </div>
                            <div className="flex flex-row gap-4 mt-4 items-center">
                                <label className="w-36 text-subtext">Department:</label>
                                <input
                                    type="text"
                                    value={department}
                                    onChange={(e) => setDepartment(e.target.value)}
                                    className="border p-1 rounded-xl w-full"
                                />
                            </div>
                            <div className="flex flex-row gap-4 mt-4 items-center">
                                <label className="w-36 text-subtext">Email Address:</label>
                                <input
                                    type="email"
                                    value={emailAddr}
                                    onChange={(e) => setEmailAddr(e.target.value)}
                                    className="border p-1 rounded-xl w-full"
                                />
                            </div>
                            <div className="flex flex-row gap-4 mt-4 items-center">
                                <label className="w-36 text-subtext">Phone:</label>
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="border p-1 rounded-xl w-full"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="mt-4 space-y-6">
                            <div className="flex items-center gap-4">
                                <span className="w-36 text-subtext">Full Name:</span>
                                <span className="font-medium">{fullName || displayName}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="w-36 text-subtext">Department:</span>
                                <span className="font-medium">{department || "-"}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="w-36 text-subtext">Email Address:</span>
                                <span className="font-medium">{emailAddr || "-"}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="w-36 text-subtext">Phone:</span>
                                <span className="font-medium">{phone || "-"}</span>
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex flex-col p-10 gap-4 items-center rounded-3xl bg-components shadow-md">
                    <div className="w-52 h-52 text-8xl bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-white/20">
                        {userInitial}
                    </div>
                    <button className="bg-button px-6 py-4 rounded-xl text-base text-white font-semibold hover:bg-buttonHover transition">
                        Change Profile Photo
                    </button>
                </div>
            </div>

            <div className="bg-components rounded-3xl shadow-md p-6 mt-4">
                <h1 className="text-xl md:text-2xl font-semibold text-title">
                    About
                </h1>

                <div className="flex flex-row items-center gap-4 mt-4">
                    <label className="w-36 text-subtext">Bio:</label>
                    {editing ? (
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            className="border p-2 rounded-xl w-full"
                            rows="3"
                            placeholder="Write something about yourself..."
                        />
                    ) : (
                        <span className="font-medium">{bio || "-"}</span>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 flex-wrap">
                <button
                    className="bg-accent px-4 py-2 rounded-lg text-white font-semibold hover:bg-accentHover transition mt-4"
                    onClick={() => {
                        if (editing) {
                            // TODO: persist changes to Firestore
                            console.log("Saving profile", { fullName, department, emailAddr, phone, bio });
                        }
                        setEditing(!editing);
                    }}
                >
                    {editing ? "Save Changes" : "Edit Profile"}
                </button>

                {editing && (
                    <button
                        className="bg-gray-300 px-4 py-2 rounded-lg text-gray-700 font-semibold hover:bg-gray-400 transition mt-4"
                        onClick={() => {
                            setEditing(false);
                            // Reset to original values
                            setFullName(userDoc?.firstName || user?.displayName || "");
                            setDepartment(userDoc?.department || "");
                            setEmailAddr(userDoc?.email || user?.email || "");
                            setPhone(userDoc?.phone || "");
                            setBio(userDoc?.bio || "");
                        }}
                    >
                        Cancel
                    </button>
                )}

                {/* Change Password Button */}
                <button
                    className="bg-orange-500 px-4 py-2 rounded-lg text-white font-semibold hover:bg-orange-700 transition mt-4 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleChangePassword}
                    disabled={sendingPasswordReset}
                >
                    {sendingPasswordReset ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Sending...
                        </>
                    ) : (
                        <>
                            <KeyRound className="w-4 h-4" />
                            Change Password
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}