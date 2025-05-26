import React from "react";
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { zodResolver } from '@hookform/resolvers/zod';
import { ImagePlusIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

interface Props {
  onAddImage: (url: string, mimeType: string) => void;
}

export default function ImageDialog({ onAddImage }: Props) {
  const [open, setOpen] = useState(false);
  const formSchema = z.object({
    url: z.string().url(),
    mimeType: z.string()
  });
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: '',
      mimeType: 'image/jpeg'
    }
  });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          const base64Url = reader.result;
          onAddImage(base64Url as string, file.type);
          setOpen(false);
        };
        reader.readAsDataURL(file);
      } else {
        // Handle the error case where the file is too large or not an image
        toast.error(
          'File is too large or not an image. Please select an image file under 10 MB.'
        );
      }
    },
    [onAddImage]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'image/*': [] }
  });

  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      if (!open) return;
      const items = event.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i]?.type.indexOf('image') !== -1) {
            const file = items[i]?.getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = () => {
                const base64Url = reader.result;
                onAddImage(base64Url as string, file.type);
                setOpen(false);
              };
              reader.readAsDataURL(file);
            }
          }
        }
      }
    },
    [onAddImage, open]
  );

  useEffect(() => {
    // Add paste event listener
    document.addEventListener('paste', handlePaste);

    return () => {
      // Remove paste event listener
      document.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    onAddImage(values.url, values.mimeType);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <DialogTrigger asChild>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="text-muted-foreground"
              onClick={() => setOpen(true)}
              variant="ghost"
              size="icon"
            >
              <ImagePlusIcon size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add Image</p>
          </TooltipContent>
        </Tooltip>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Image</DialogTitle>
          <DialogDescription>
            Add an image to the message by uploading a file or providing a URL.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div
            {...getRootProps()}
            className="dropzonerelative flex h-40 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-200 p-6 dark:border-gray-800"
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="text-sm font-medium">
                Drop files here to upload
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                or click to browse
              </span>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-slate-500">
                Or add image URL
              </span>
            </div>
          </div>
          <Form {...form}>
            <form
              id="imageForm"
              onSubmit={form.handleSubmit(onSubmit)}
              className="grid gap-2"
            >
              <FormField
                control={form.control}
                name="url"
                render={(field) => (
                  <FormItem>
                    <FormLabel />
                    <FormControl>
                      <Input
                        placeholder="https://example.com/image.jpg"
                        {...field}
                        {...form.register('url')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
        <DialogFooter>
          <Button type="submit" form="imageForm">
            Import Image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
