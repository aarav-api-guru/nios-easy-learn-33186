import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { chapters, subjects } from '@/data/mockData';
import Navbar from '@/components/Navbar';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FileText, Search } from 'lucide-react';
import MathDriveBrowser from '@/components/MathDriveBrowser';
const Subject = () => {
    const { subjectId } = useParams();
    const subject = subjects.find(s => s.id === subjectId);
    const isMathematics = subjectId === 'math';
    const subjectChapters = isMathematics ? [] : chapters.filter(c => c.subjectId === subjectId);
    const [searchQuery, setSearchQuery] = useState('');
    const filteredChapters = isMathematics
        ? []
        : subjectChapters.filter(chapter => chapter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chapter.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chapter.chapterNumber.toString().includes(searchQuery));
    if (!subject) {
        return <div>Subject not found</div>;
    }
    return (<div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Subject Header */}
          <div className="text-center mb-12">
            <div className="text-7xl mb-4">{subject.icon}</div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{subject.name}</h1>
            <p className="text-xl text-muted-foreground">{subject.description}</p>
          </div>

          {isMathematics ? (
            <div className="mt-12">
              <MathDriveBrowser />
            </div>
          ) : (
            <>
              {/* Search Bar */}
              <div className="max-w-2xl mx-auto mb-10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search chapters by name or number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-11 h-12 text-base rounded-xl shadow-sm"
                  />
                </div>
              </div>

              {/* Chapters Grid */}
              <div className="grid md:grid-cols-2 gap-6">
                {filteredChapters.length > 0 ? (
                  filteredChapters.map((chapter, index) => {
                    const chapterIndex = chapter.chapterNumber ?? index + 1;
                    const formattedNumber = String(chapterIndex).padStart(2, '0');

                    return (
                      <Link key={chapter.id} to={`/${subjectId}/chapter/${chapter.id}`}>
                        <Card className="group h-full border border-border/60 bg-card/90 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
                          <CardHeader className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1 text-sm font-semibold text-emerald-700">
                                <span>Chapter {chapterIndex}</span>
                                <span className="flex items-center gap-1 text-emerald-700/90">
                                  <FileText className="h-4 w-4" />
                                  {chapter.resourceCount}
                                </span>
                              </div>
                              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                                {formattedNumber}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <CardTitle className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                                {chapter.name}
                              </CardTitle>
                              <CardDescription className="text-base text-muted-foreground">
                                {chapter.description}
                              </CardDescription>
                            </div>
                          </CardHeader>
                        </Card>
                      </Link>
                    );
                  })
                ) : (
                  <div className="col-span-full text-center py-12">
                    <p className="text-muted-foreground text-lg">
                      No chapters found matching "{searchQuery}"
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>);
};
export default Subject;
