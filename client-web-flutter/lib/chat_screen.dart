import 'dart:async';
import 'package:flutter/material.dart';
import 'llm_service.dart';

class ChatMessage {
  final String text;
  final bool isUser;
  final DateTime timestamp;

  ChatMessage({required this.text, required this.isUser})
      : timestamp = DateTime.now();
}

class ChatScreen extends StatefulWidget {
  final String apiKey;
  final VoidCallback? onDisconnect;

  const ChatScreen({super.key, required this.apiKey, this.onDisconnect});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final List<ChatMessage> _messages = [];
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  late final LlmService _llm = LlmService();
  StreamSubscription<String>? _sub;
  bool _isLoading = false;
  Timer? _responseTimeout;

  static const _timeoutDuration = Duration(seconds: 90);

  static const _commands = [
    ('What labs are available?', 'Labs'),
    ('Is the backend healthy?', 'Health'),
    ('Show scores for lab-04', 'Scores'),
    ('Sync the data', 'Sync'),
  ];

  @override
  void initState() {
    super.initState();
    _llm.connect(apiKey: widget.apiKey);
    _sub = _llm.responses.listen(
      (content) {
        _responseTimeout?.cancel();
        setState(() {
          _messages.add(ChatMessage(text: content, isUser: false));
          _isLoading = false;
        });
        _scrollToBottom();
      },
      onError: (_) => _handleDisconnect(),
      onDone: () => _handleDisconnect(),
    );
    _addBotMessage(
      'Connected to Nanobot!\n\n'
      'I can help you check system health, browse labs, view scores, '
      'and answer questions about your LMS data.\n\n'
      'Type a question or use the buttons below.',
    );
  }

  void _handleDisconnect() {
    _responseTimeout?.cancel();
    if (!mounted) return;
    setState(() => _isLoading = false);
    _addBotMessage('Connection lost. Please refresh the page to reconnect.');
  }

  void _startResponseTimeout() {
    _responseTimeout?.cancel();
    _responseTimeout = Timer(_timeoutDuration, () {
      if (!mounted) return;
      setState(() => _isLoading = false);
      _addBotMessage(
        'The assistant is taking too long to respond. '
        'Try again or refresh the page.',
      );
    });
  }

  void _addBotMessage(String text) {
    setState(() {
      _messages.add(ChatMessage(text: text, isUser: false));
    });
    _scrollToBottom();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _sendMessage(String text) {
    final trimmed = text.trim();
    if (trimmed.isEmpty || _isLoading) return;

    _controller.clear();
    setState(() {
      _messages.add(ChatMessage(text: trimmed, isUser: true));
      _isLoading = true;
    });
    _scrollToBottom();

    _llm.send(trimmed);
    _startResponseTimeout();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('LMS Chatbot'),
        backgroundColor: Theme.of(context).colorScheme.primary,
        foregroundColor: Colors.white,
        actions: [
          if (widget.onDisconnect != null)
            IconButton(
              icon: const Icon(Icons.logout),
              tooltip: 'Disconnect',
              onPressed: widget.onDisconnect,
            ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length + (_isLoading ? 1 : 0),
              itemBuilder: (context, index) {
                if (index == _messages.length) {
                  return _buildLoadingBubble();
                }
                return _buildMessageBubble(_messages[index]);
              },
            ),
          ),
          _buildCommandMenu(),
          _buildInputArea(),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(ChatMessage message) {
    final isUser = message.isUser;
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isUser
              ? Theme.of(context).colorScheme.primary
              : Colors.grey[200],
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isUser ? 16 : 4),
            bottomRight: Radius.circular(isUser ? 4 : 16),
          ),
        ),
        child: SelectableText(
          message.text,
          style: TextStyle(
            color: isUser ? Colors.white : Colors.black87,
            fontSize: 15,
          ),
        ),
      ),
    );
  }

  Widget _buildLoadingBubble() {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.grey[200],
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(16),
            topRight: Radius.circular(16),
            bottomLeft: Radius.circular(4),
            bottomRight: Radius.circular(16),
          ),
        ),
        child: const SizedBox(
          width: 48,
          height: 24,
          child: Center(
            child: SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCommandMenu() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        border: Border(top: BorderSide(color: Colors.grey[300]!)),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: _commands.map((cmd) {
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: ActionChip(
                label: Text(cmd.$2),
                onPressed: _isLoading ? null : () => _sendMessage(cmd.$1),
                backgroundColor: Colors.white,
                side: BorderSide(color: Theme.of(context).colorScheme.primary),
                labelStyle: TextStyle(
                  color: Theme.of(context).colorScheme.primary,
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildInputArea() {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Colors.grey[300]!)),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _controller,
              decoration: const InputDecoration(
                hintText: 'Type a message...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.all(Radius.circular(24)),
                ),
                contentPadding:
                    EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              ),
              onSubmitted: _sendMessage,
              enabled: !_isLoading,
            ),
          ),
          const SizedBox(width: 8),
          IconButton.filled(
            onPressed:
                _isLoading ? null : () => _sendMessage(_controller.text),
            icon: const Icon(Icons.send),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _responseTimeout?.cancel();
    _sub?.cancel();
    _controller.dispose();
    _scrollController.dispose();
    _llm.dispose();
    super.dispose();
  }
}
