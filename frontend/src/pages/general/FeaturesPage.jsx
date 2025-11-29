import Navbar from "../../components/NavBar";
import Footer from "../../components/Footer";

import { ReactComponent as Brain } from "../../assets/ic_brain.svg";
import { ReactComponent as Chart } from "../../assets/ic_analytic.svg";
import { ReactComponent as Clock } from "../../assets/ic_clock.svg";
import { ReactComponent as Collab } from "../../assets/ic_collab.svg";
import { ReactComponent as Flash } from "../../assets/ic_flash.svg";
import { ReactComponent as Shield } from "../../assets/ic_shield.svg";

export default function FeaturesPage() {
    const features = [
        {
            icon: <Brain className="h-20 w-20 mt-6 mx-auto" />,
            title: "Smart Quiz Creation",
            desc: "AI-powered question generation and intelligent difficulty adjustment for optimal learning."
        },
        {
            icon: <Clock className="h-20 w-20 mt-6 mx-auto" />,
            title: "Real-time Feedback",
            desc: "Instant results and explanations help learners understand concepts immediately."
        },
        {
            icon: <Chart className="h-20 w-20 mt-6 mx-auto" />,
            title: "Advanced Analytics",
            desc: "Detailed performance insights and progress tracking for both students and teachers."
        },
        {
            icon: <Collab className="h-20 w-20 mt-6 mx-auto" />,
            title: "Collaborative Learning",
            desc: "Share quizzes, compete with friends, and learn together in a social environment."
        },
        {
            icon: <Flash className="h-20 w-20 mt-6 mx-auto" />,
            title: "Lightning Fast",
            desc: "Optimized performance ensures smooth quiz-taking experience on any device."
        },
        {
            icon: <Shield className="h-20 w-20 mt-6 mx-auto" />,
            title: "Secure & Private",
            desc: "Your data is protected with enterprise-grade security and privacy controls."
        },
    ];

    return (
        <div className="bg-gradient-to-b from-background via-background to-green-200 min-h-screen pt-6 w-full font-Outfit">
            <Navbar />

            <div className="px-10 md:px-40 mx-auto mt-10 md:mt-20">
                <h1 className="text-5xl md:text-7xl font-semibold">Features</h1>
                <p className="text-base md:text-2xl mt-2 font-light">
                    Everything you need to create engaging quizzes and track learning progress
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 w-full mt-10">
                    {features.map((f, index) => (
                        <div key={index} className="bg-components rounded-3xl flex flex-col py-6 px-4 text-center">
                            {f.icon}
                            <h1 className="text-2xl font-bold mt-4">{f.title}</h1>
                            <p className="text-base font-light mt-2 mb-4 px-4">
                                {f.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            <Footer />
        </div>
    );
}
