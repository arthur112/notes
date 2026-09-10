import { Plus, Search } from "lucide-react";

import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Separator } from "@/shared/components/ui/separator";

/** Static showcase of the base primitives (buttons, badges, cards, inputs…). */
export function PrimitiveGallery() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {(["default", "secondary", "outline", "ghost", "destructive", "link"] as const).map(
          (variant) => (
            <Button key={variant} variant={variant}>
              {variant}
            </Button>
          ),
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="xs">xs</Button>
        <Button size="sm">sm</Button>
        <Button size="default">default</Button>
        <Button size="lg">lg</Button>
        <Button size="icon-sm" aria-label="Add">
          <Plus />
        </Button>
        <Button disabled>disabled</Button>
        <Button variant="outline" size="icon-sm" aria-label="Search">
          <Search />
        </Button>
      </div>
      <Separator />
      <div className="flex flex-wrap items-center gap-2">
        <Badge>default</Badge>
        <Badge variant="secondary">secondary</Badge>
        <Badge variant="outline">outline</Badge>
        <Badge variant="destructive">destructive</Badge>
        <Badge className="border-transparent bg-sky-500/10 text-sky-700 ring-1 ring-sky-600/15 dark:text-sky-300">
          sky
        </Badge>
        <Badge className="border-transparent bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-600/15 dark:text-emerald-300">
          emerald
        </Badge>
      </div>
      <Separator />
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Card title</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Cards come from the shared ui set — used by Finance summary cards, details and demos.
          </CardContent>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <Avatar>
            <AvatarFallback>AC</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">Alex Chen</p>
            <p className="text-xs text-muted-foreground">alex@frontbase.example</p>
          </div>
        </Card>
        <div className="flex flex-col gap-2">
          <Input placeholder="Search…" />
          <Input placeholder="Disabled" disabled />
          <Input placeholder="With error" aria-invalid />
        </div>
      </div>
    </div>
  );
}
