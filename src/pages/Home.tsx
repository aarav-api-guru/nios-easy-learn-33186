import { subjects } from '@/data/mockData';
import SubjectCard from '@/components/SubjectCard';
import Navbar from '@/components/Navbar';
import { GraduationCap, BookOpen, FileText } from 'lucide-react';

const Home = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block p-4 bg-primary/10 rounded-full mb-6">
              <GraduationCap className="h-16 w-16 text-primary" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">
              Welcome to NIOS Class 10
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8">
              Your complete resource hub for question papers, answer keys, and study materials
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 bg-card px-6 py-3 rounded-lg shadow-sm">
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="font-semibold">Multiple Subjects</span>
              </div>
              <div className="flex items-center gap-2 bg-card px-6 py-3 rounded-lg shadow-sm">
                <FileText className="h-5 w-5 text-secondary" />
                <span className="font-semibold">Free Resources</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Subjects Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Explore Subjects</h2>
            <p className="text-xl text-muted-foreground">Choose a subject to access chapter-wise resources</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {subjects.map((subject) => (
              <SubjectCard key={subject.id} subject={subject} />
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">What We Offer</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-4xl mb-4">📚</div>
                <h3 className="text-xl font-semibold mb-2">Question Papers</h3>
                <p className="text-muted-foreground">Access previous years' question papers for practice</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-4">✅</div>
                <h3 className="text-xl font-semibold mb-2">Answer Keys</h3>
                <p className="text-muted-foreground">Detailed solutions to help you learn better</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-4">💬</div>
                <h3 className="text-xl font-semibold mb-2">Community</h3>
                <p className="text-muted-foreground">Ask questions and share knowledge</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
