import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { chapters, subjects } from '@/data/mockData';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
              <div className="max-w-xl mx-auto mb-8">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"/>
                  <Input type="text" placeholder="Search chapters by name or number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-12 text-base"/>
                </div>
              </div>

              {/* Chapters Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredChapters.length > 0 ? (filteredChapters.map((chapter) => (<Link key={chapter.id} to={`/${subjectId}/chapter/${chapter.id}`}>
                    <Card className="h-full hover:shadow-lg transition-all hover:scale-105 border-2 hover:border-primary cursor-pointer">
                      <CardHeader>
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="secondary" className="text-sm">
                            Chapter {chapter.chapterNumber}
                          </Badge>
                          <Badge variant="outline" className="gap-1">
                            <FileText className="h-3 w-3"/>
                            {chapter.resourceCount}
                          </Badge>
                        </div>
                        <CardTitle className="text-xl">{chapter.name}</CardTitle>
                        <CardDescription>{chapter.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Click to view resources and materials
                        </p>
                      </CardContent>
                    </Card>
                  </Link>))) : (<div className="col-span-full text-center py-12">
                    <p className="text-muted-foreground text-lg">
                      No chapters found matching "{searchQuery}"
                    </p>
                  </div>)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>);
};
export default Subject;
