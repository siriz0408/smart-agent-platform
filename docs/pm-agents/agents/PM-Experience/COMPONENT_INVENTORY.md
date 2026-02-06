# UI Component Inventory

> **Last Updated:** 2026-02-06  
> **Total Components:** 50+ UI components + 7 layout components

This document provides a comprehensive inventory of all UI components in the Smart Agent platform, including their props, interfaces, and usage examples.

---

## Table of Contents

- [UI Components (`src/components/ui/`)](#ui-components)
- [Layout Components (`src/components/layout/`)](#layout-components)
- [Component Usage Patterns](#component-usage-patterns)

---

## UI Components

### Accordion

**File:** `src/components/ui/accordion.tsx`  
**Source:** Radix UI (`@radix-ui/react-accordion`)

**Exports:**
- `Accordion` - Root component
- `AccordionItem` - Individual accordion item
- `AccordionTrigger` - Clickable trigger with chevron icon
- `AccordionContent` - Expandable content area

**Props:**
- `Accordion`: Standard Radix Accordion props (`type`, `defaultValue`, `value`, `onValueChange`, `collapsible`, `disabled`)
- `AccordionItem`: Standard HTML div props + `value` (required)
- `AccordionTrigger`: Standard button props
- `AccordionContent`: Standard div props

**Usage Example:**
```tsx
<Accordion type="single" collapsible>
  <AccordionItem value="item-1">
    <AccordionTrigger>Is it accessible?</AccordionTrigger>
    <AccordionContent>Yes. It adheres to the WAI-ARIA design pattern.</AccordionContent>
  </AccordionItem>
</Accordion>
```

---

### Alert Dialog

**File:** `src/components/ui/alert-dialog.tsx`  
**Source:** Radix UI (`@radix-ui/react-alert-dialog`)

**Exports:**
- `AlertDialog` - Root component
- `AlertDialogTrigger` - Button that opens dialog
- `AlertDialogContent` - Dialog content container
- `AlertDialogHeader` - Header section
- `AlertDialogFooter` - Footer section
- `AlertDialogTitle` - Dialog title
- `AlertDialogDescription` - Dialog description
- `AlertDialogAction` - Primary action button
- `AlertDialogCancel` - Cancel button

**Props:**
- `AlertDialog`: `open`, `onOpenChange`, `defaultOpen`
- `AlertDialogContent`: Standard dialog content props + positioning props
- `AlertDialogAction`: Button props (uses `buttonVariants`)
- `AlertDialogCancel`: Button props (variant: "outline")

**Usage Example:**
```tsx
<AlertDialog>
  <AlertDialogTrigger>Delete Account</AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction>Continue</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

### Alert

**File:** `src/components/ui/alert.tsx`  
**Source:** Custom component with CVA variants

**Exports:**
- `Alert` - Root alert component
- `AlertTitle` - Alert title (h5)
- `AlertDescription` - Alert description text

**Props:**
- `Alert`: `React.HTMLAttributes<HTMLDivElement>` + `variant?: "default" | "destructive"`
- `AlertTitle`: `React.HTMLAttributes<HTMLHeadingElement>`
- `AlertDescription`: `React.HTMLAttributes<HTMLParagraphElement>`

**Variants:**
- `default`: Standard alert with border
- `destructive`: Red/destructive styling

**Usage Example:**
```tsx
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>Your session has expired. Please log in again.</AlertDescription>
</Alert>
```

---

### Aspect Ratio

**File:** `src/components/ui/aspect-ratio.tsx`  
**Source:** Radix UI (`@radix-ui/react-aspect-ratio`)

**Exports:**
- `AspectRatio` - Wrapper component

**Props:**
- `AspectRatio`: `ratio` (number, e.g., 16/9), standard div props

**Usage Example:**
```tsx
<AspectRatio ratio={16 / 9}>
  <img src="image.jpg" alt="Image" />
</AspectRatio>
```

---

### Avatar

**File:** `src/components/ui/avatar.tsx`  
**Source:** Radix UI (`@radix-ui/react-avatar`)

**Exports:**
- `Avatar` - Root component
- `AvatarImage` - Image element
- `AvatarFallback` - Fallback text/icon

**Props:**
- `Avatar`: Standard div props
- `AvatarImage`: `src`, `alt`, standard img props
- `AvatarFallback`: Standard div props (displays when image fails to load)

**Usage Example:**
```tsx
<Avatar>
  <AvatarImage src="/avatar.jpg" alt="User" />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>
```

**Used in:** `AppHeader.tsx`, `GleanSidebar.tsx`, `RoleBadge.tsx`

---

### Badge

**File:** `src/components/ui/badge.tsx`  
**Source:** Custom component with CVA variants

**Exports:**
- `Badge` - Badge component
- `badgeVariants` - CVA variant function

**Props:**
- `Badge`: `React.HTMLAttributes<HTMLDivElement>` + `variant?: "default" | "secondary" | "destructive" | "outline"`

**Variants:**
- `default`: Primary color background
- `secondary`: Secondary color background
- `destructive`: Red/destructive background
- `outline`: Border only

**Usage Example:**
```tsx
<Badge variant="secondary">New</Badge>
<Badge variant="destructive">3</Badge>
```

**Used in:** `GleanSidebar.tsx` (unread count), `RoleBadge.tsx`

---

### Breadcrumb

**File:** `src/components/ui/breadcrumb.tsx`  
**Source:** Custom component with Radix Slot

**Exports:**
- `Breadcrumb` - Root nav element
- `BreadcrumbList` - Ordered list container
- `BreadcrumbItem` - List item
- `BreadcrumbLink` - Link element
- `BreadcrumbPage` - Current page indicator
- `BreadcrumbSeparator` - Separator (default: ChevronRight)
- `BreadcrumbEllipsis` - Ellipsis for overflow

**Props:**
- `Breadcrumb`: Standard nav props + `separator?: React.ReactNode`
- `BreadcrumbLink`: Standard anchor props + `asChild?: boolean`
- `BreadcrumbPage`: Standard span props

**Usage Example:**
```tsx
<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">Home</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>Settings</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

---

### Button

**File:** `src/components/ui/button.tsx`  
**Source:** Custom component with CVA variants + Radix Slot

**Exports:**
- `Button` - Button component
- `buttonVariants` - CVA variant function

**Props:**
- `Button`: `React.ButtonHTMLAttributes<HTMLButtonElement>` + `variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"` + `size?: "default" | "sm" | "lg" | "touch" | "icon" | "icon-lg" | "icon-touch"` + `asChild?: boolean`

**Variants:**
- `default`: Primary button
- `destructive`: Red/destructive action
- `outline`: Outlined button
- `secondary`: Secondary color
- `ghost`: Transparent background
- `link`: Text link style

**Sizes:**
- `default`: h-10 px-4 py-2
- `sm`: h-9 px-3
- `lg`: h-11 px-8
- `touch`: h-12 px-8 (48px - mobile touch target)
- `icon`: h-10 w-10
- `icon-lg`: h-11 w-11
- `icon-touch`: h-12 w-12

**Usage Example:**
```tsx
<Button variant="default" size="lg">Submit</Button>
<Button variant="ghost" size="icon"><Plus /></Button>
<Button variant="destructive">Delete</Button>
```

**Used extensively:** `AppHeader.tsx`, `GleanSidebar.tsx`, `MobileBottomNav.tsx`, all pages

---

### Calendar

**File:** `src/components/ui/calendar.tsx`  
**Source:** `react-day-picker` + custom styling

**Exports:**
- `Calendar` - Calendar component

**Props:**
- `Calendar`: `React.ComponentProps<typeof DayPicker>` (all react-day-picker props)

**Usage Example:**
```tsx
<Calendar mode="single" selected={date} onSelect={setDate} />
```

---

### Card

**File:** `src/components/ui/card.tsx`  
**Source:** Custom component

**Exports:**
- `Card` - Root card container
- `CardHeader` - Header section
- `CardTitle` - Title (h3)
- `CardDescription` - Description text
- `CardContent` - Main content area
- `CardFooter` - Footer section

**Props:**
- All components accept standard HTML div props

**Usage Example:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

**Used in:** Multiple pages for content cards

---

### Carousel

**File:** `src/components/ui/carousel.tsx`  
**Source:** `embla-carousel-react` + custom components

**Exports:**
- `Carousel` - Root component
- `CarouselContent` - Content wrapper
- `CarouselItem` - Individual slide
- `CarouselPrevious` - Previous button
- `CarouselNext` - Next button
- `CarouselApi` - Type for carousel API

**Props:**
- `Carousel`: `opts?: CarouselOptions`, `plugins?: CarouselPlugin`, `orientation?: "horizontal" | "vertical"`, `setApi?: (api: CarouselApi) => void`
- `CarouselPrevious/Next`: Button props

**Usage Example:**
```tsx
<Carousel>
  <CarouselContent>
    <CarouselItem>Slide 1</CarouselItem>
    <CarouselItem>Slide 2</CarouselItem>
  </CarouselContent>
  <CarouselPrevious />
  <CarouselNext />
</Carousel>
```

---

### Chart

**File:** `src/components/ui/chart.tsx`  
**Source:** `recharts` + custom wrapper

**Exports:**
- `ChartContainer` - Root container
- `ChartTooltip` - Tooltip component
- `ChartTooltipContent` - Custom tooltip content
- `ChartLegend` - Legend component
- `ChartLegendContent` - Custom legend content
- `ChartConfig` - Type for chart configuration

**Props:**
- `ChartContainer`: `config: ChartConfig`, standard div props
- `ChartTooltipContent`: Recharts Tooltip props + `hideLabel?`, `hideIndicator?`, `indicator?`, `nameKey?`, `labelKey?`

**Usage Example:**
```tsx
<ChartContainer config={chartConfig}>
  <AreaChart data={data}>
    <Area dataKey="value" />
    <ChartTooltip content={<ChartTooltipContent />} />
  </AreaChart>
</ChartContainer>
```

---

### Checkbox

**File:** `src/components/ui/checkbox.tsx`  
**Source:** Radix UI (`@radix-ui/react-checkbox`)

**Exports:**
- `Checkbox` - Checkbox component

**Props:**
- `Checkbox`: Standard checkbox props (`checked`, `onCheckedChange`, `disabled`, etc.)

**Usage Example:**
```tsx
<Checkbox checked={checked} onCheckedChange={setChecked} />
```

---

### Collapsible

**File:** `src/components/ui/collapsible.tsx`  
**Source:** Radix UI (`@radix-ui/react-collapsible`)

**Exports:**
- `Collapsible` - Root component
- `CollapsibleTrigger` - Toggle button
- `CollapsibleContent` - Expandable content

**Props:**
- `Collapsible`: `open`, `onOpenChange`, `defaultOpen`
- `CollapsibleTrigger`: Standard button props
- `CollapsibleContent`: Standard div props

**Usage Example:**
```tsx
<Collapsible>
  <CollapsibleTrigger>Toggle</CollapsibleTrigger>
  <CollapsibleContent>Content</CollapsibleContent>
</Collapsible>
```

---

### Command

**File:** `src/components/ui/command.tsx`  
**Source:** `cmdk` + Dialog wrapper

**Exports:**
- `Command` - Root command component
- `CommandDialog` - Dialog wrapper
- `CommandInput` - Search input
- `CommandList` - Results list
- `CommandEmpty` - Empty state
- `CommandGroup` - Grouped items
- `CommandItem` - Individual item
- `CommandShortcut` - Keyboard shortcut display
- `CommandSeparator` - Separator

**Props:**
- `Command`: Standard cmdk props
- `CommandDialog`: Dialog props
- `CommandInput`: Standard input props

**Usage Example:**
```tsx
<CommandDialog>
  <CommandInput placeholder="Search..." />
  <CommandList>
    <CommandEmpty>No results found.</CommandEmpty>
    <CommandGroup heading="Suggestions">
      <CommandItem>Calendar</CommandItem>
    </CommandGroup>
  </CommandList>
</CommandDialog>
```

---

### Context Menu

**File:** `src/components/ui/context-menu.tsx`  
**Source:** Radix UI (`@radix-ui/react-context-menu`)

**Exports:**
- `ContextMenu` - Root component
- `ContextMenuTrigger` - Trigger element
- `ContextMenuContent` - Menu content
- `ContextMenuItem` - Menu item
- `ContextMenuCheckboxItem` - Checkbox item
- `ContextMenuRadioItem` - Radio item
- `ContextMenuLabel` - Label
- `ContextMenuSeparator` - Separator
- `ContextMenuShortcut` - Keyboard shortcut
- Plus sub-menu components

**Props:**
- Standard Radix context menu props

**Usage Example:**
```tsx
<ContextMenu>
  <ContextMenuTrigger>Right click me</ContextMenuTrigger>
  <ContextMenuContent>
    <ContextMenuItem>Copy</ContextMenuItem>
    <ContextMenuItem>Paste</ContextMenuItem>
  </ContextMenuContent>
</ContextMenu>
```

---

### Dialog

**File:** `src/components/ui/dialog.tsx`  
**Source:** Radix UI (`@radix-ui/react-dialog`)

**Exports:**
- `Dialog` - Root component
- `DialogTrigger` - Trigger button
- `DialogContent` - Dialog content
- `DialogHeader` - Header section
- `DialogFooter` - Footer section
- `DialogTitle` - Title
- `DialogDescription` - Description
- `DialogClose` - Close button

**Props:**
- `Dialog`: `open`, `onOpenChange`, `defaultOpen`
- `DialogContent`: Standard dialog content props
- `DialogTitle`: Standard heading props
- `DialogDescription`: Standard paragraph props

**Usage Example:**
```tsx
<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Used in:** `EditProfileDialog.tsx`, `WorkspaceSwitcher.tsx`, `MobileBottomNav.tsx`

---

### Drawer

**File:** `src/components/ui/drawer.tsx`  
**Source:** `vaul` (drawer library)

**Exports:**
- `Drawer` - Root component
- `DrawerTrigger` - Trigger button
- `DrawerContent` - Drawer content
- `DrawerHeader` - Header section
- `DrawerFooter` - Footer section
- `DrawerTitle` - Title
- `DrawerDescription` - Description

**Props:**
- `Drawer`: `shouldScaleBackground?: boolean`, standard drawer props
- `DrawerContent`: Standard drawer content props

**Usage Example:**
```tsx
<Drawer>
  <DrawerTrigger>Open Drawer</DrawerTrigger>
  <DrawerContent>
    <DrawerHeader>
      <DrawerTitle>Title</DrawerTitle>
      <DrawerDescription>Description</DrawerDescription>
    </DrawerHeader>
    <DrawerFooter>
      <Button>Submit</Button>
    </DrawerFooter>
  </DrawerContent>
</Drawer>
```

---

### Dropdown Menu

**File:** `src/components/ui/dropdown-menu.tsx`  
**Source:** Radix UI (`@radix-ui/react-dropdown-menu`)

**Exports:**
- `DropdownMenu` - Root component
- `DropdownMenuTrigger` - Trigger button
- `DropdownMenuContent` - Menu content
- `DropdownMenuItem` - Menu item
- `DropdownMenuCheckboxItem` - Checkbox item
- `DropdownMenuRadioItem` - Radio item
- `DropdownMenuLabel` - Label
- `DropdownMenuSeparator` - Separator
- `DropdownMenuShortcut` - Keyboard shortcut
- Plus sub-menu components

**Props:**
- Standard Radix dropdown menu props
- `DropdownMenuItem`: `inset?: boolean`

**Usage Example:**
```tsx
<DropdownMenu>
  <DropdownMenuTrigger>Open</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuLabel>My Account</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Profile</DropdownMenuItem>
    <DropdownMenuItem>Settings</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Used extensively:** `AppHeader.tsx`, `GleanSidebar.tsx`, `NotificationBell.tsx`

---

### Form

**File:** `src/components/ui/form.tsx`  
**Source:** `react-hook-form` + Radix Label

**Exports:**
- `Form` - FormProvider wrapper
- `FormField` - Field wrapper
- `FormItem` - Item container
- `FormLabel` - Label
- `FormControl` - Control wrapper
- `FormDescription` - Description text
- `FormMessage` - Error message
- `useFormField` - Hook for form field context

**Props:**
- `Form`: React Hook Form `FormProvider` props
- `FormField`: `Controller` props from react-hook-form
- `FormLabel`: Standard label props
- `FormControl`: Radix Slot props
- `FormMessage`: Standard paragraph props

**Usage Example:**
```tsx
<Form {...form}>
  <FormField
    control={form.control}
    name="email"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input {...field} />
        </FormControl>
        <FormDescription>Your email address</FormDescription>
        <FormMessage />
      </FormItem>
    )}
  />
</Form>
```

---

### Hover Card

**File:** `src/components/ui/hover-card.tsx`  
**Source:** Radix UI (`@radix-ui/react-hover-card`)

**Exports:**
- `HoverCard` - Root component
- `HoverCardTrigger` - Trigger element
- `HoverCardContent` - Card content

**Props:**
- `HoverCard`: Standard hover card props
- `HoverCardContent`: `align?: "start" | "center" | "end"`, `sideOffset?: number`

**Usage Example:**
```tsx
<HoverCard>
  <HoverCardTrigger>Hover me</HoverCardTrigger>
  <HoverCardContent>
    <p>Card content</p>
  </HoverCardContent>
</HoverCard>
```

---

### Input

**File:** `src/components/ui/input.tsx`  
**Source:** Custom input component

**Exports:**
- `Input` - Input component

**Props:**
- `Input`: Standard HTML input props (`type`, `value`, `onChange`, `placeholder`, etc.)

**Usage Example:**
```tsx
<Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
```

**Used extensively:** All forms, `AppHeader.tsx` (search), `GleanSidebar.tsx`

---

### Input OTP

**File:** `src/components/ui/input-otp.tsx`  
**Source:** `input-otp` library

**Exports:**
- `InputOTP` - Root component
- `InputOTPGroup` - Group container
- `InputOTPSlot` - Individual slot
- `InputOTPSeparator` - Separator (Dot icon)

**Props:**
- `InputOTP`: Standard input-otp props (`maxLength`, `value`, `onChange`, etc.)
- `InputOTPSlot`: `index: number` (required)

**Usage Example:**
```tsx
<InputOTP maxLength={6}>
  <InputOTPGroup>
    <InputOTPSlot index={0} />
    <InputOTPSlot index={1} />
  </InputOTPGroup>
  <InputOTPSeparator />
  <InputOTPGroup>
    <InputOTPSlot index={2} />
    <InputOTPSlot index={3} />
  </InputOTPGroup>
</InputOTP>
```

---

### Label

**File:** `src/components/ui/label.tsx`  
**Source:** Radix UI (`@radix-ui/react-label`)

**Exports:**
- `Label` - Label component

**Props:**
- `Label`: Standard label props (`htmlFor`, `children`)

**Usage Example:**
```tsx
<Label htmlFor="email">Email</Label>
<Input id="email" />
```

---

### Menubar

**File:** `src/components/ui/menubar.tsx`  
**Source:** Radix UI (`@radix-ui/react-menubar`)

**Exports:**
- `Menubar` - Root component
- `MenubarMenu` - Menu container
- `MenubarTrigger` - Trigger button
- `MenubarContent` - Menu content
- `MenubarItem` - Menu item
- Plus sub-menu and other components

**Props:**
- Standard Radix menubar props

**Usage Example:**
```tsx
<Menubar>
  <MenubarMenu>
    <MenubarTrigger>File</MenubarTrigger>
    <MenubarContent>
      <MenubarItem>New</MenubarItem>
    </MenubarContent>
  </MenubarMenu>
</Menubar>
```

---

### Navigation Menu

**File:** `src/components/ui/navigation-menu.tsx`  
**Source:** Radix UI (`@radix-ui/react-navigation-menu`)

**Exports:**
- `NavigationMenu` - Root component
- `NavigationMenuList` - List container
- `NavigationMenuItem` - Menu item
- `NavigationMenuTrigger` - Trigger button
- `NavigationMenuContent` - Content area
- `NavigationMenuLink` - Link component
- `NavigationMenuViewport` - Viewport container
- `NavigationMenuIndicator` - Indicator
- `navigationMenuTriggerStyle` - CVA style function

**Props:**
- Standard Radix navigation menu props

**Usage Example:**
```tsx
<NavigationMenu>
  <NavigationMenuList>
    <NavigationMenuItem>
      <NavigationMenuTrigger>Item</NavigationMenuTrigger>
      <NavigationMenuContent>Content</NavigationMenuContent>
    </NavigationMenuItem>
  </NavigationMenuList>
</NavigationMenu>
```

---

### Pagination

**File:** `src/components/ui/pagination.tsx`  
**Source:** Custom component with Button variants

**Exports:**
- `Pagination` - Root nav element
- `PaginationContent` - List container
- `PaginationItem` - List item
- `PaginationLink` - Link/button
- `PaginationPrevious` - Previous button
- `PaginationNext` - Next button
- `PaginationEllipsis` - Ellipsis indicator

**Props:**
- `Pagination`: Standard nav props
- `PaginationLink`: `isActive?: boolean`, `size?: ButtonProps["size"]`, anchor props
- `PaginationPrevious/Next`: Link props

**Usage Example:**
```tsx
<Pagination>
  <PaginationContent>
    <PaginationItem>
      <PaginationPrevious href="#" />
    </PaginationItem>
    <PaginationItem>
      <PaginationLink isActive>1</PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationNext href="#" />
    </PaginationItem>
  </PaginationContent>
</Pagination>
```

---

### Popover

**File:** `src/components/ui/popover.tsx`  
**Source:** Radix UI (`@radix-ui/react-popover`)

**Exports:**
- `Popover` - Root component
- `PopoverTrigger` - Trigger button
- `PopoverContent` - Popover content

**Props:**
- `Popover`: `open`, `onOpenChange`, `defaultOpen`
- `PopoverContent`: `align?: "start" | "center" | "end"`, `sideOffset?: number`

**Usage Example:**
```tsx
<Popover>
  <PopoverTrigger>Open</PopoverTrigger>
  <PopoverContent>
    <p>Popover content</p>
  </PopoverContent>
</Popover>
```

---

### Progress

**File:** `src/components/ui/progress.tsx`  
**Source:** Radix UI (`@radix-ui/react-progress`)

**Exports:**
- `Progress` - Progress bar component

**Props:**
- `Progress`: `value?: number` (0-100), standard div props

**Usage Example:**
```tsx
<Progress value={33} />
```

---

### Radio Group

**File:** `src/components/ui/radio-group.tsx`  
**Source:** Radix UI (`@radix-ui/react-radio-group`)

**Exports:**
- `RadioGroup` - Root component
- `RadioGroupItem` - Radio button item

**Props:**
- `RadioGroup`: `value`, `onValueChange`, `defaultValue`, `disabled`
- `RadioGroupItem`: `value` (required), standard radio props

**Usage Example:**
```tsx
<RadioGroup value={value} onValueChange={setValue}>
  <RadioGroupItem value="option1" id="r1" />
  <Label htmlFor="r1">Option 1</Label>
  <RadioGroupItem value="option2" id="r2" />
  <Label htmlFor="r2">Option 2</Label>
</RadioGroup>
```

---

### Resizable

**File:** `src/components/ui/resizable.tsx`  
**Source:** `react-resizable-panels`

**Exports:**
- `ResizablePanelGroup` - Panel group container
- `ResizablePanel` - Individual panel
- `ResizableHandle` - Resize handle

**Props:**
- `ResizablePanelGroup`: `direction?: "horizontal" | "vertical"`, standard panel group props
- `ResizablePanel`: Standard panel props (`defaultSize`, `minSize`, `maxSize`, etc.)
- `ResizableHandle`: `withHandle?: boolean`

**Usage Example:**
```tsx
<ResizablePanelGroup direction="horizontal">
  <ResizablePanel defaultSize={50}>Panel 1</ResizablePanel>
  <ResizableHandle />
  <ResizablePanel defaultSize={50}>Panel 2</ResizablePanel>
</ResizablePanelGroup>
```

---

### Scroll Area

**File:** `src/components/ui/scroll-area.tsx`  
**Source:** Radix UI (`@radix-ui/react-scroll-area`)

**Exports:**
- `ScrollArea` - Scrollable container
- `ScrollBar` - Scrollbar component

**Props:**
- `ScrollArea`: Standard div props
- `ScrollBar`: `orientation?: "vertical" | "horizontal"`

**Usage Example:**
```tsx
<ScrollArea className="h-72">
  <div>Long content</div>
</ScrollArea>
```

**Used in:** `NotificationBell.tsx`

---

### Select

**File:** `src/components/ui/select.tsx`  
**Source:** Radix UI (`@radix-ui/react-select`)

**Exports:**
- `Select` - Root component
- `SelectGroup` - Group container
- `SelectValue` - Display value
- `SelectTrigger` - Trigger button
- `SelectContent` - Dropdown content
- `SelectLabel` - Label
- `SelectItem` - Option item
- `SelectSeparator` - Separator
- `SelectScrollUpButton` - Scroll up button
- `SelectScrollDownButton` - Scroll down button

**Props:**
- `Select`: `value`, `onValueChange`, `defaultValue`, `disabled`
- `SelectTrigger`: Standard button props
- `SelectContent`: `position?: "popper" | "item-aligned"`
- `SelectItem`: `value` (required)

**Usage Example:**
```tsx
<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

**Used in:** `RoleSwitcher.tsx`

---

### Separator

**File:** `src/components/ui/separator.tsx`  
**Source:** Radix UI (`@radix-ui/react-separator`)

**Exports:**
- `Separator` - Separator line component

**Props:**
- `Separator`: `orientation?: "horizontal" | "vertical"`, `decorative?: boolean`

**Usage Example:**
```tsx
<div>
  <p>Above</p>
  <Separator />
  <p>Below</p>
</div>
```

---

### Sheet

**File:** `src/components/ui/sheet.tsx`  
**Source:** Radix Dialog (`@radix-ui/react-dialog`) with side variants

**Exports:**
- `Sheet` - Root component
- `SheetTrigger` - Trigger button
- `SheetContent` - Sheet content
- `SheetHeader` - Header section
- `SheetFooter` - Footer section
- `SheetTitle` - Title
- `SheetDescription` - Description
- `SheetClose` - Close button

**Props:**
- `Sheet`: Standard dialog props
- `SheetContent`: `side?: "top" | "bottom" | "left" | "right"` (default: "right")

**Usage Example:**
```tsx
<Sheet>
  <SheetTrigger>Open</SheetTrigger>
  <SheetContent side="left">
    <SheetHeader>
      <SheetTitle>Title</SheetTitle>
      <SheetDescription>Description</SheetDescription>
    </SheetHeader>
  </SheetContent>
</Sheet>
```

**Used in:** `MobileBottomNav.tsx` (More menu)

---

### Sidebar

**File:** `src/components/ui/sidebar.tsx`  
**Source:** Custom sidebar system with context

**Exports:**
- `SidebarProvider` - Context provider
- `Sidebar` - Root sidebar component
- `SidebarTrigger` - Toggle button
- `SidebarRail` - Resize handle
- `SidebarInset` - Main content area
- `SidebarInput` - Search input
- `SidebarHeader` - Header section
- `SidebarFooter` - Footer section
- `SidebarContent` - Content area
- `SidebarGroup` - Group container
- `SidebarGroupLabel` - Group label
- `SidebarGroupAction` - Group action button
- `SidebarGroupContent` - Group content
- `SidebarMenu` - Menu list
- `SidebarMenuItem` - Menu item
- `SidebarMenuButton` - Menu button
- `SidebarMenuAction` - Menu action button
- `SidebarMenuBadge` - Menu badge
- `SidebarMenuSkeleton` - Loading skeleton
- `SidebarMenuSub` - Submenu
- `SidebarMenuSubItem` - Submenu item
- `SidebarMenuSubButton` - Submenu button
- `SidebarSeparator` - Separator
- `useSidebar` - Hook for sidebar context

**Props:**
- `SidebarProvider`: `defaultOpen?: boolean`, `open?: boolean`, `onOpenChange?: (open: boolean) => void`
- `Sidebar`: `side?: "left" | "right"`, `variant?: "sidebar" | "floating" | "inset"`, `collapsible?: "offcanvas" | "icon" | "none"`
- `SidebarMenuButton`: `isActive?: boolean`, `tooltip?: string | TooltipContentProps`, `variant?: "default" | "outline"`, `size?: "default" | "sm" | "lg"`

**Usage Example:**
```tsx
<SidebarProvider>
  <Sidebar>
    <SidebarHeader>
      <SidebarInput placeholder="Search..." />
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Menu</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton isActive>
              <Home />
              <span>Home</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
  </Sidebar>
  <SidebarInset>
    <SidebarTrigger />
    <main>Content</main>
  </SidebarInset>
</SidebarProvider>
```

---

### Skeleton

**File:** `src/components/ui/skeleton.tsx`  
**Source:** Custom component

**Exports:**
- `Skeleton` - Loading skeleton component

**Props:**
- `Skeleton`: Standard div props

**Usage Example:**
```tsx
<Skeleton className="h-4 w-[250px]" />
<Skeleton className="h-4 w-[200px]" />
```

**Used in:** `Contacts.tsx`, `Properties.tsx` (loading states)

---

### Slider

**File:** `src/components/ui/slider.tsx`  
**Source:** Radix UI (`@radix-ui/react-slider`)

**Exports:**
- `Slider` - Slider component

**Props:**
- `Slider`: `value?: number[]`, `onValueChange?: (value: number[]) => void`, `defaultValue?: number[]`, `min?: number`, `max?: number`, `step?: number`, `disabled?`

**Usage Example:**
```tsx
<Slider value={[50]} onValueChange={(value) => setValue(value[0])} min={0} max={100} />
```

---

### Sonner (Toast)

**File:** `src/components/ui/sonner.tsx`  
**Source:** `sonner` library

**Exports:**
- `Toaster` - Toast container component
- `toast` - Toast function

**Props:**
- `Toaster`: Standard Sonner props (`theme`, `position`, etc.)

**Usage Example:**
```tsx
import { toast } from "@/components/ui/sonner";

toast("Event created", {
  description: "Friday, February 10, 2023 at 5:57 PM",
});
```

---

### Switch

**File:** `src/components/ui/switch.tsx`  
**Source:** Radix UI (`@radix-ui/react-switch`)

**Exports:**
- `Switch` - Switch toggle component

**Props:**
- `Switch`: `checked?: boolean`, `onCheckedChange?: (checked: boolean) => void`, `defaultChecked?: boolean`, `disabled?`

**Usage Example:**
```tsx
<Switch checked={enabled} onCheckedChange={setEnabled} />
```

---

### Table

**File:** `src/components/ui/table.tsx`  
**Source:** Custom table components

**Exports:**
- `Table` - Root table element
- `TableHeader` - Header section
- `TableBody` - Body section
- `TableFooter` - Footer section
- `TableRow` - Row element
- `TableHead` - Header cell
- `TableCell` - Data cell
- `TableCaption` - Caption

**Props:**
- All components accept standard HTML table element props

**Usage Example:**
```tsx
<Table>
  <TableCaption>A list of your recent invoices.</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead>Invoice</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>INV001</TableCell>
      <TableCell>Paid</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

**Used in:** `Contacts.tsx`, `Documents.tsx`, `AdminAgents.tsx`, `AdminTeammates.tsx`

---

### Tabs

**File:** `src/components/ui/tabs.tsx`  
**Source:** Radix UI (`@radix-ui/react-tabs`)

**Exports:**
- `Tabs` - Root component
- `TabsList` - Tab list container
- `TabsTrigger` - Tab button
- `TabsContent` - Tab content panel

**Props:**
- `Tabs`: `value`, `onValueChange`, `defaultValue`
- `TabsTrigger`: `value` (required)
- `TabsContent`: `value` (required)

**Usage Example:**
```tsx
<Tabs value={value} onValueChange={setValue}>
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

---

### Textarea

**File:** `src/components/ui/textarea.tsx`  
**Source:** Custom textarea component

**Exports:**
- `Textarea` - Textarea component
- `TextareaProps` - Type definition

**Props:**
- `Textarea`: Standard HTML textarea props (`value`, `onChange`, `placeholder`, `rows`, etc.)

**Usage Example:**
```tsx
<Textarea placeholder="Type your message here." value={message} onChange={(e) => setMessage(e.target.value)} />
```

---

### Toast

**File:** `src/components/ui/toast.tsx`  
**Source:** Radix UI (`@radix-ui/react-toast`)

**Exports:**
- `ToastProvider` - Provider component
- `ToastViewport` - Viewport container
- `Toast` - Toast component
- `ToastTitle` - Title
- `ToastDescription` - Description
- `ToastClose` - Close button
- `ToastAction` - Action button
- `ToastProps` - Type definition
- `ToastActionElement` - Type definition

**Props:**
- `Toast`: `variant?: "default" | "destructive"`
- `ToastAction`: Standard button props

**Usage Example:**
```tsx
<ToastProvider>
  <Toast>
    <ToastTitle>Scheduled: Catch up</ToastTitle>
    <ToastDescription>Friday, February 10, 2023 at 5:57 PM</ToastDescription>
    <ToastAction altText="Goto schedule to undo">Undo</ToastAction>
  </Toast>
  <ToastViewport />
</ToastProvider>
```

---

### Toaster

**File:** `src/components/ui/toaster.tsx`  
**Source:** Custom wrapper using `useToast` hook

**Exports:**
- `Toaster` - Toast container component

**Props:**
- None (uses `useToast` hook internally)

**Usage Example:**
```tsx
<Toaster />
```

**Note:** Use with `useToast` hook from `@/hooks/use-toast` or `@/components/ui/use-toast`

---

### Toggle

**File:** `src/components/ui/toggle.tsx`  
**Source:** Radix UI (`@radix-ui/react-toggle`)

**Exports:**
- `Toggle` - Toggle button component
- `toggleVariants` - CVA variant function

**Props:**
- `Toggle`: `pressed?: boolean`, `onPressedChange?: (pressed: boolean) => void`, `variant?: "default" | "outline"`, `size?: "default" | "sm" | "lg"`

**Usage Example:**
```tsx
<Toggle pressed={pressed} onPressedChange={setPressed}>
  Bold
</Toggle>
```

---

### Toggle Group

**File:** `src/components/ui/toggle-group.tsx`  
**Source:** Radix UI (`@radix-ui/react-toggle-group`)

**Exports:**
- `ToggleGroup` - Root component
- `ToggleGroupItem` - Individual toggle item

**Props:**
- `ToggleGroup`: `type: "single" | "multiple"`, `value`, `onValueChange`, `variant?`, `size?`
- `ToggleGroupItem`: `value` (required), `variant?`, `size?`

**Usage Example:**
```tsx
<ToggleGroup type="single" value={value} onValueChange={setValue}>
  <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
  <ToggleGroupItem value="italic">Italic</ToggleGroupItem>
</ToggleGroup>
```

---

### Tooltip

**File:** `src/components/ui/tooltip.tsx`  
**Source:** Radix UI (`@radix-ui/react-tooltip`)

**Exports:**
- `Tooltip` - Root component
- `TooltipTrigger` - Trigger element
- `TooltipContent` - Tooltip content
- `TooltipProvider` - Provider component

**Props:**
- `Tooltip`: `open`, `onOpenChange`, `defaultOpen`
- `TooltipContent`: `sideOffset?: number`, positioning props (`side`, `align`)

**Usage Example:**
```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>Hover me</TooltipTrigger>
    <TooltipContent>
      <p>Tooltip content</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

**Used in:** `GleanSidebar.tsx` (navigation tooltips)

---

### useToast Hook

**File:** `src/components/ui/use-toast.ts`  
**Source:** Re-export from hooks

**Exports:**
- `useToast` - Hook for toast management
- `toast` - Toast function

**Usage Example:**
```tsx
import { useToast } from "@/components/ui/use-toast";

const { toast } = useToast();

toast({
  title: "Scheduled: Catch up",
  description: "Friday, February 10, 2023 at 5:57 PM",
});
```

---

## Layout Components

### AppHeader

**File:** `src/components/layout/AppHeader.tsx`  
**Purpose:** Main application header with search, notifications, and user menu

**Props:**
- None (uses hooks: `useAuth`, `useRole`, `useWorkspace`)

**Features:**
- Global search bar (desktop) / search button (mobile)
- Notification bell with unread count
- User dropdown menu with profile, settings, sign out
- Testing mode indicator (when override active)
- Help button
- Admin console link (super_admin only)

**Used in:** `AppLayout.tsx`

---

### AppLayout

**File:** `src/components/layout/AppLayout.tsx`  
**Purpose:** Main application layout wrapper

**Props:**
- `children: ReactNode` - Page content

**Features:**
- Desktop: 72px purple sidebar (`GleanSidebar`)
- Mobile: Bottom tab navigation (`MobileBottomNav`)
- Responsive padding for mobile nav
- iOS safe area support
- Skip to content link (accessibility)
- Trial banner support

**Usage Example:**
```tsx
<AppLayout>
  <YourPageContent />
</AppLayout>
```

---

### GleanSidebar

**File:** `src/components/layout/GleanSidebar.tsx`  
**Purpose:** Glean-inspired narrow icon sidebar (72px, purple background)

**Props:**
- None (uses hooks: `useAuth`, `useRole`, `useWorkspace`)

**Features:**
- Purple background (#6B5CE7)
- Icon + label stacked vertically
- Role-based navigation items
- Active state with white/20 background
- Workspace switcher
- Unread message badge
- User profile dropdown at bottom
- Desktop only (hidden on mobile)

**Used in:** `AppLayout.tsx`

---

### MobileBottomNav

**File:** `src/components/layout/MobileBottomNav.tsx`  
**Purpose:** Mobile bottom tab navigation (iOS/Android pattern)

**Props:**
- None (uses hooks: `useRole`)

**Features:**
- 5 tabs maximum for optimal UX
- Role-based tabs
- Purple active states (Glean branding)
- 56px touch targets
- Safe area support for iOS notch
- "More" menu sheet for additional pages
- Mobile only (hidden on desktop)

**Used in:** `AppLayout.tsx`

---

### NotificationBell

**File:** `src/components/layout/NotificationBell.tsx`  
**Purpose:** Notification dropdown with unread count

**Props:**
- None (uses hook: `useNotifications`)

**Features:**
- Bell icon with unread badge
- Dropdown menu with recent notifications
- Mark as read / mark all as read
- Delete notification
- Time ago formatting
- Type-specific icons
- Scrollable list (max 10 shown)
- "View all" link

**Used in:** `AppHeader.tsx`

---

### RoleBadge

**File:** `src/components/layout/RoleBadge.tsx`  
**Purpose:** Role indicator badge component

**Props:**
- `variant?: "full" | "compact"` (default: "full")
- `className?: string`

**Features:**
- Shows current user role with color-coded badge
- Full variant: Icon + Label
- Compact variant: Icon only
- Always visible (unlike RoleSwitcher)

**Role Colors:**
- `super_admin`: Purple-600
- `admin`: Purple-500
- `agent`: Blue-600
- `buyer`: Green-600
- `seller`: Orange-600

**Used in:** `AppHeader.tsx`, `GleanSidebar.tsx`

---

### RoleSwitcher

**File:** `src/components/layout/RoleSwitcher.tsx`  
**Purpose:** Role switching dropdown (for multi-role users)

**Props:**
- `collapsed?: boolean` (default: false)

**Features:**
- Interactive dropdown for multi-role users
- Read-only badge for single-role users
- Role descriptions
- Icon + label display
- Collapsed variant (icon only)

**Used in:** `GleanSidebar.tsx` (workspace switcher area)

---

## Component Usage Patterns

### Form Pattern

```tsx
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const form = useForm();

<Form {...form}>
  <FormField
    control={form.control}
    name="email"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
  <Button type="submit">Submit</Button>
</Form>
```

### Dialog Pattern

```tsx
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      <Button onClick={handleSubmit}>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Table Pattern

```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {data.map((item) => (
      <TableRow key={item.id}>
        <TableCell>{item.name}</TableCell>
        <TableCell>{item.email}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Loading State Pattern

```tsx
import { Skeleton } from "@/components/ui/skeleton";

{isLoading ? (
  <>
    <Skeleton className="h-4 w-[250px]" />
    <Skeleton className="h-4 w-[200px]" />
  </>
) : (
  <ActualContent />
)}
```

### Toast Notification Pattern

```tsx
import { useToast } from "@/hooks/use-toast";

const { toast } = useToast();

toast({
  title: "Success",
  description: "Operation completed successfully.",
});
```

---

## Component Statistics

| Category | Count |
|----------|-------|
| **UI Components** | 50+ |
| **Layout Components** | 7 |
| **Radix UI Based** | ~35 |
| **Custom Components** | ~15 |
| **Form Components** | 1 (Form system) |
| **Navigation Components** | 3 (Sidebar, Menubar, NavigationMenu) |
| **Data Display** | 5 (Table, Card, Chart, Badge, Avatar) |
| **Overlays** | 6 (Dialog, Sheet, Drawer, Popover, Tooltip, HoverCard) |
| **Input Components** | 8 (Input, Textarea, Select, Checkbox, Radio, Switch, Slider, InputOTP) |

---

## Notes

- All components use Tailwind CSS for styling
- Most components are built on Radix UI primitives for accessibility
- Components follow shadcn/ui patterns
- Mobile-first responsive design
- Touch target compliance (minimum 44px/48px)
- Full TypeScript support
- Consistent prop patterns across similar components

---

**Last Updated:** 2026-02-06  
**Maintained by:** PM-Experience
