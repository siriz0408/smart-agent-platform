import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ConversationList } from "@/components/messages/ConversationList";
import { MessageThread } from "@/components/messages/MessageThread";
import { MessageInput } from "@/components/messages/MessageInput";
import { ConversationHeader } from "@/components/messages/ConversationHeader";
import { NewConversationDialog } from "@/components/messages/NewConversationDialog";
import { MessageSearchResults } from "@/components/messages/MessageSearchResults";
import { useConversation } from "@/hooks/useConversation";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import { useReadReceipts } from "@/hooks/useReadReceipts";
import { useMessageSearch } from "@/hooks/useMessageSearch";
import { useConversationArchive } from "@/hooks/useConversationArchive";
import { MessageSquare } from "lucide-react";

export default function Messages() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    conversationId || null
  );
  const [showMobileList, setShowMobileList] = useState(!conversationId);
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);

  const {
    conversations,
    isLoadingConversations,
    messages,
    isLoadingMessages,
    selectedConversation,
    sendMessage,
    isSending,
    refetchConversations,
    createOrFindContactConversation,
  } = useConversation(selectedConversationId);

  // Subscribe to realtime messages
  useRealtimeMessages(selectedConversationId, refetchConversations);

  // Mark conversations as read
  const { markAsRead } = useReadReceipts();

  // Message search
  const {
    searchQuery,
    setSearchQuery,
    results: searchResults,
    isSearching,
    isSearchOpen,
    openSearch,
    closeSearch,
  } = useMessageSearch();

  // Archive
  const { archiveConversation, unarchiveConversation } = useConversationArchive();

  // Sync URL param with state
  useEffect(() => {
    if (conversationId && conversationId !== selectedConversationId) {
      setSelectedConversationId(conversationId);
      setShowMobileList(false);
    }
  }, [conversationId, selectedConversationId]);

  // Mark conversation as read when opened and messages loaded
  useEffect(() => {
    if (selectedConversationId && !isLoadingMessages && messages.length > 0) {
      markAsRead.mutate(selectedConversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId, isLoadingMessages, messages.length]);

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setShowMobileList(false);
    navigate(`/messages/${id}`);
  };

  const handleSearchResultSelect = (conversationId: string) => {
    closeSearch();
    handleSelectConversation(conversationId);
  };

  const handleArchive = async () => {
    if (selectedConversationId) {
      await archiveConversation(selectedConversationId);
      refetchConversations();
    }
  };

  const handleUnarchive = async () => {
    if (selectedConversationId) {
      await unarchiveConversation(selectedConversationId);
      refetchConversations();
    }
  };

  const handleBackToList = () => {
    setShowMobileList(true);
    setSelectedConversationId(null);
    navigate("/messages");
  };

  const handleSendMessage = async (
    content: string,
    uploadAttachments?: (messageId: string) => Promise<void>
  ) => {
    if (selectedConversationId) {
      await sendMessage(content, uploadAttachments);
    }
  };

  const handleNewConversation = async (contactId: string) => {
    const newConversationId = await createOrFindContactConversation(contactId);
    if (newConversationId) {
      setSelectedConversationId(newConversationId);
      setShowMobileList(false);
      navigate(`/messages/${newConversationId}`);
    }
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* Conversation List / Search Panel - hidden on mobile when conversation selected */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-border flex-shrink-0 ${
            showMobileList ? "block" : "hidden md:block"
          }`}
        >
          {isSearchOpen ? (
            <MessageSearchResults
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              results={searchResults}
              isSearching={isSearching}
              onSelectResult={handleSearchResultSelect}
              onClose={closeSearch}
            />
          ) : (
            <ConversationList
              conversations={conversations}
              isLoading={isLoadingConversations}
              selectedId={selectedConversationId}
              onSelect={handleSelectConversation}
              onNewConversation={() => setIsNewConversationOpen(true)}
              onOpenMessageSearch={openSearch}
            />
          )}
        </div>

        {/* Message Thread */}
        <div
          className={`flex-1 flex flex-col ${
            !showMobileList ? "block" : "hidden md:flex"
          }`}
        >
          {selectedConversationId && selectedConversation ? (
            <>
              <ConversationHeader
                conversation={selectedConversation}
                onBack={handleBackToList}
                onArchive={handleArchive}
                onUnarchive={handleUnarchive}
              />
              <MessageThread
                messages={messages}
                isLoading={isLoadingMessages}
                conversationId={selectedConversationId ?? undefined}
              />
              <MessageInput
                onSend={handleSendMessage}
                disabled={isSending}
                conversationId={selectedConversationId ?? undefined}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm">Choose from your existing conversations or click "New" to start one</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <NewConversationDialog
        open={isNewConversationOpen}
        onOpenChange={setIsNewConversationOpen}
        onSelectContact={handleNewConversation}
      />
    </AppLayout>
  );
}
