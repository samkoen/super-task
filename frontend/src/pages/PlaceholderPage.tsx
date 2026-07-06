import { Card, CardContent, Typography } from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { he } from "../i18n/he";

interface PlaceholderPageProps {
  title: string;
}

export default function PlaceholderPage({ title }: PlaceholderPageProps) {
  const { user } = useAuth();

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          {title}
        </Typography>
        {user && (
          <Typography variant="body1" color="text.secondary" gutterBottom>
            {he.welcome(user.full_name)}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary">
          {he.phase0Hint}
        </Typography>
      </CardContent>
    </Card>
  );
}
