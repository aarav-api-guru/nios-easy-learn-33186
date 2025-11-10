import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ArrowRight } from 'lucide-react';
import type { Subject } from '@/data/mockData';

interface SubjectCardProps {
  subject: Subject;
}

const SubjectCard = ({ subject }: SubjectCardProps) => {
  return (
    <Card className="hover:shadow-lg transition-shadow border-2 hover:border-primary">
      <CardHeader>
        <div className="text-6xl mb-4">{subject.icon}</div>
        <CardTitle className="text-2xl">{subject.name}</CardTitle>
        <CardDescription className="text-base">{subject.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full" size="lg">
          <Link to={`/${subject.id}`}>
            Explore Chapters
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default SubjectCard;
