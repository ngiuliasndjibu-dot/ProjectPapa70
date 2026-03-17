# ESC/POS Printer Service for Receipt Printers
# Compatible with: Epson TM-U220, TM-T20, TM-T88, and similar ESC/POS printers
# Supports both network (TCP/IP) and USB printing

import socket
import asyncio
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import logging

logger = logging.getLogger(__name__)

# ESC/POS Commands
class ESC:
    # Basic commands
    INIT = b'\x1b\x40'              # Initialize printer
    CUT = b'\x1d\x56\x00'           # Full cut
    CUT_PARTIAL = b'\x1d\x56\x01'   # Partial cut
    BEEP = b'\x1b\x42\x02\x02'      # Beep (2 times, 200ms each)
    
    # Text formatting
    BOLD_ON = b'\x1b\x45\x01'
    BOLD_OFF = b'\x1b\x45\x00'
    DOUBLE_HEIGHT_ON = b'\x1b\x21\x10'
    DOUBLE_WIDTH_ON = b'\x1b\x21\x20'
    DOUBLE_SIZE_ON = b'\x1b\x21\x30'
    NORMAL_SIZE = b'\x1b\x21\x00'
    UNDERLINE_ON = b'\x1b\x2d\x01'
    UNDERLINE_OFF = b'\x1b\x2d\x00'
    INVERSE_ON = b'\x1d\x42\x01'
    INVERSE_OFF = b'\x1d\x42\x00'
    
    # Alignment
    ALIGN_LEFT = b'\x1b\x61\x00'
    ALIGN_CENTER = b'\x1b\x61\x01'
    ALIGN_RIGHT = b'\x1b\x61\x02'
    
    # Line spacing
    LINE_SPACING_DEFAULT = b'\x1b\x32'
    LINE_SPACING_NARROW = b'\x1b\x33\x10'
    
    # Character set
    CHARSET_PC437 = b'\x1b\x74\x00'  # USA
    CHARSET_PC850 = b'\x1b\x74\x02'  # Multilingual
    CHARSET_PC858 = b'\x1b\x74\x13'  # Euro
    CHARSET_WPC1252 = b'\x1b\x74\x10'  # Windows Western European
    
    # Cash drawer
    OPEN_DRAWER = b'\x1b\x70\x00\x19\xfa'  # Open cash drawer (pin 2)
    
    # Paper feed
    FEED_LINE = b'\x0a'             # Line feed
    FEED_3_LINES = b'\x1b\x64\x03'  # Feed 3 lines


class PrinterType(str, Enum):
    NETWORK = "network"
    USB = "usb"
    SERIAL = "serial"


class PrinterConfig:
    """Configuration for a printer"""
    def __init__(
        self,
        name: str,
        ip_address: str = None,
        port: int = 9100,
        printer_type: PrinterType = PrinterType.NETWORK,
        usb_vendor_id: int = None,
        usb_product_id: int = None,
        serial_port: str = None,
        paper_width: int = 48,  # Characters per line (48 for 80mm, 32 for 58mm)
        encoding: str = 'cp850',  # Character encoding
        cut_paper: bool = True,
        beep_on_print: bool = True,
        open_drawer: bool = False,
    ):
        self.name = name
        self.ip_address = ip_address
        self.port = port
        self.printer_type = printer_type
        self.usb_vendor_id = usb_vendor_id
        self.usb_product_id = usb_product_id
        self.serial_port = serial_port
        self.paper_width = paper_width
        self.encoding = encoding
        self.cut_paper = cut_paper
        self.beep_on_print = beep_on_print
        self.open_drawer = open_drawer


class ReceiptBuilder:
    """Builder for creating receipt content"""
    
    def __init__(self, paper_width: int = 48, encoding: str = 'cp850'):
        self.paper_width = paper_width
        self.encoding = encoding
        self.content = bytearray()
        self._init_printer()
    
    def _init_printer(self):
        """Initialize printer and set character encoding"""
        self.content.extend(ESC.INIT)
        self.content.extend(ESC.CHARSET_PC850)
        self.content.extend(ESC.LINE_SPACING_DEFAULT)
    
    def _encode(self, text: str) -> bytes:
        """Encode text with fallback for unsupported characters"""
        try:
            return text.encode(self.encoding)
        except UnicodeEncodeError:
            # Replace unsupported characters
            return text.encode(self.encoding, errors='replace')
    
    def text(self, text: str) -> 'ReceiptBuilder':
        """Add plain text"""
        self.content.extend(self._encode(text))
        return self
    
    def line(self, text: str = '') -> 'ReceiptBuilder':
        """Add a line of text with line feed"""
        self.content.extend(self._encode(text))
        self.content.extend(ESC.FEED_LINE)
        return self
    
    def newline(self, count: int = 1) -> 'ReceiptBuilder':
        """Add empty lines"""
        for _ in range(count):
            self.content.extend(ESC.FEED_LINE)
        return self
    
    def bold(self, text: str) -> 'ReceiptBuilder':
        """Add bold text"""
        self.content.extend(ESC.BOLD_ON)
        self.content.extend(self._encode(text))
        self.content.extend(ESC.BOLD_OFF)
        return self
    
    def bold_line(self, text: str) -> 'ReceiptBuilder':
        """Add bold text with line feed"""
        return self.bold(text).newline()
    
    def double_size(self, text: str) -> 'ReceiptBuilder':
        """Add double size text (height and width)"""
        self.content.extend(ESC.DOUBLE_SIZE_ON)
        self.content.extend(self._encode(text))
        self.content.extend(ESC.NORMAL_SIZE)
        return self
    
    def double_size_line(self, text: str) -> 'ReceiptBuilder':
        """Add double size text with line feed"""
        return self.double_size(text).newline()
    
    def double_height(self, text: str) -> 'ReceiptBuilder':
        """Add double height text"""
        self.content.extend(ESC.DOUBLE_HEIGHT_ON)
        self.content.extend(self._encode(text))
        self.content.extend(ESC.NORMAL_SIZE)
        return self
    
    def center(self) -> 'ReceiptBuilder':
        """Set center alignment"""
        self.content.extend(ESC.ALIGN_CENTER)
        return self
    
    def left(self) -> 'ReceiptBuilder':
        """Set left alignment"""
        self.content.extend(ESC.ALIGN_LEFT)
        return self
    
    def right(self) -> 'ReceiptBuilder':
        """Set right alignment"""
        self.content.extend(ESC.ALIGN_RIGHT)
        return self
    
    def separator(self, char: str = '-') -> 'ReceiptBuilder':
        """Add a separator line"""
        self.content.extend(self._encode(char * self.paper_width))
        self.content.extend(ESC.FEED_LINE)
        return self
    
    def double_separator(self) -> 'ReceiptBuilder':
        """Add a double separator line"""
        return self.separator('=')
    
    def row(self, left: str, right: str) -> 'ReceiptBuilder':
        """Add a row with left and right aligned text"""
        # Calculate spacing
        space_count = self.paper_width - len(left) - len(right)
        if space_count < 1:
            space_count = 1
        text = left + ' ' * space_count + right
        return self.line(text[:self.paper_width])
    
    def item_row(self, quantity: int, name: str, price: str) -> 'ReceiptBuilder':
        """Add an item row: quantity x name ... price"""
        qty_str = f"{quantity}x "
        # Calculate available space for name
        available = self.paper_width - len(qty_str) - len(price) - 1
        if len(name) > available:
            name = name[:available-2] + '..'
        spaces = self.paper_width - len(qty_str) - len(name) - len(price)
        text = qty_str + name + ' ' * max(spaces, 1) + price
        return self.line(text[:self.paper_width])
    
    def cut(self, partial: bool = False) -> 'ReceiptBuilder':
        """Cut the paper"""
        self.newline(3)
        self.content.extend(ESC.CUT_PARTIAL if partial else ESC.CUT)
        return self
    
    def beep(self) -> 'ReceiptBuilder':
        """Sound the beeper"""
        self.content.extend(ESC.BEEP)
        return self
    
    def open_drawer(self) -> 'ReceiptBuilder':
        """Open the cash drawer"""
        self.content.extend(ESC.OPEN_DRAWER)
        return self
    
    def build(self) -> bytes:
        """Return the complete receipt data"""
        return bytes(self.content)


class PrinterService:
    """Service for managing and printing to ESC/POS printers"""
    
    def __init__(self):
        self.printers: Dict[str, PrinterConfig] = {}
        self._print_queue: List[Dict[str, Any]] = []
    
    def add_printer(self, printer_id: str, config: PrinterConfig):
        """Register a printer"""
        self.printers[printer_id] = config
        logger.info(f"Printer added: {config.name} ({printer_id})")
    
    def remove_printer(self, printer_id: str):
        """Remove a printer"""
        if printer_id in self.printers:
            del self.printers[printer_id]
            logger.info(f"Printer removed: {printer_id}")
    
    async def check_printer_status(self, printer_id: str) -> Dict[str, Any]:
        """Check if a printer is online and responding"""
        if printer_id not in self.printers:
            return {"status": "error", "message": "Printer not found"}
        
        config = self.printers[printer_id]
        
        if config.printer_type == PrinterType.NETWORK:
            try:
                # Try to connect to the printer
                reader, writer = await asyncio.wait_for(
                    asyncio.open_connection(config.ip_address, config.port),
                    timeout=5.0
                )
                writer.close()
                await writer.wait_closed()
                return {"status": "online", "message": "Printer is responding"}
            except asyncio.TimeoutError:
                return {"status": "offline", "message": "Connection timeout"}
            except Exception as e:
                return {"status": "error", "message": str(e)}
        
        return {"status": "unknown", "message": "Printer type not supported for status check"}
    
    async def print_raw(self, printer_id: str, data: bytes) -> Dict[str, Any]:
        """Send raw data to a printer"""
        if printer_id not in self.printers:
            return {"success": False, "error": "Printer not found"}
        
        config = self.printers[printer_id]
        
        if config.printer_type == PrinterType.NETWORK:
            return await self._print_network(config, data)
        else:
            return {"success": False, "error": f"Printer type {config.printer_type} not implemented"}
    
    async def _print_network(self, config: PrinterConfig, data: bytes) -> Dict[str, Any]:
        """Print via network socket"""
        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(config.ip_address, config.port),
                timeout=10.0
            )
            
            writer.write(data)
            await writer.drain()
            
            writer.close()
            await writer.wait_closed()
            
            logger.info(f"Successfully printed to {config.name}")
            return {"success": True, "message": f"Printed to {config.name}"}
            
        except asyncio.TimeoutError:
            logger.error(f"Timeout printing to {config.name}")
            return {"success": False, "error": "Connection timeout"}
        except ConnectionRefusedError:
            logger.error(f"Connection refused by {config.name}")
            return {"success": False, "error": "Connection refused - printer may be offline"}
        except Exception as e:
            logger.error(f"Error printing to {config.name}: {e}")
            return {"success": False, "error": str(e)}
    
    def create_kitchen_ticket(
        self,
        order_number: int,
        table_number: int,
        server_name: str,
        items: List[Dict[str, Any]],
        notes: str = "",
        paper_width: int = 48
    ) -> bytes:
        """Create a kitchen order ticket"""
        receipt = ReceiptBuilder(paper_width=paper_width)
        
        now = datetime.now()
        
        # Header
        receipt.center()
        receipt.double_size_line("*** CUISINE ***")
        receipt.separator('=')
        
        # Order info
        receipt.left()
        receipt.double_height(f"COMMANDE #{order_number}")
        receipt.newline()
        receipt.bold_line(f"Table: {table_number}")
        receipt.line(f"Serveur: {server_name}")
        receipt.line(f"Heure: {now.strftime('%H:%M:%S')}")
        receipt.separator()
        
        # Items
        for item in items:
            qty = item.get('quantity', 1)
            name = item.get('menu_item_name', 'Article')
            
            # Print item in bold with quantity
            receipt.bold(f"{qty}x ")
            receipt.double_height_line(name)
            
            # Print notes if any
            item_notes = item.get('notes', '')
            if item_notes:
                receipt.line(f"   >> {item_notes}")
        
        # Order notes
        if notes:
            receipt.separator()
            receipt.bold_line("NOTES:")
            receipt.line(notes)
        
        # Footer
        receipt.separator('=')
        receipt.center()
        receipt.line(now.strftime('%d/%m/%Y %H:%M'))
        
        # Cut and beep
        receipt.beep()
        receipt.cut()
        
        return receipt.build()
    
    def create_bar_ticket(
        self,
        order_number: int,
        table_number: int,
        server_name: str,
        items: List[Dict[str, Any]],
        notes: str = "",
        paper_width: int = 48
    ) -> bytes:
        """Create a bar order ticket"""
        receipt = ReceiptBuilder(paper_width=paper_width)
        
        now = datetime.now()
        
        # Header
        receipt.center()
        receipt.double_size_line("*** BAR ***")
        receipt.separator('=')
        
        # Order info
        receipt.left()
        receipt.double_height(f"COMMANDE #{order_number}")
        receipt.newline()
        receipt.bold_line(f"Table: {table_number}")
        receipt.line(f"Serveur: {server_name}")
        receipt.line(f"Heure: {now.strftime('%H:%M:%S')}")
        receipt.separator()
        
        # Items
        for item in items:
            qty = item.get('quantity', 1)
            name = item.get('menu_item_name', 'Article')
            variant = item.get('variant', '')
            
            # Print item in bold with quantity
            receipt.bold(f"{qty}x ")
            receipt.double_height(name)
            if variant:
                receipt.text(f" ({variant})")
            receipt.newline()
            
            # Print notes if any
            item_notes = item.get('notes', '')
            if item_notes:
                receipt.line(f"   >> {item_notes}")
        
        # Order notes
        if notes:
            receipt.separator()
            receipt.bold_line("NOTES:")
            receipt.line(notes)
        
        # Footer
        receipt.separator('=')
        receipt.center()
        receipt.line(now.strftime('%d/%m/%Y %H:%M'))
        
        # Cut and beep
        receipt.beep()
        receipt.cut()
        
        return receipt.build()
    
    def create_receipt(
        self,
        order_number: int,
        table_number: int,
        server_name: str,
        items: List[Dict[str, Any]],
        subtotal: float,
        total: float,
        currency_symbol: str = "FCFA",
        payment_method: str = "",
        restaurant_name: str = "LUMIÈRE RESTAURANT",
        restaurant_address: str = "",
        restaurant_phone: str = "",
        notes: str = "",
        paper_width: int = 48
    ) -> bytes:
        """Create a customer receipt"""
        receipt = ReceiptBuilder(paper_width=paper_width)
        
        now = datetime.now()
        
        # Header with restaurant info
        receipt.center()
        receipt.double_size_line(restaurant_name)
        if restaurant_address:
            receipt.line(restaurant_address)
        if restaurant_phone:
            receipt.line(f"Tel: {restaurant_phone}")
        receipt.separator('=')
        
        # Order info
        receipt.left()
        receipt.row("Ticket:", f"#{order_number}")
        receipt.row("Table:", str(table_number))
        receipt.row("Serveur:", server_name)
        receipt.row("Date:", now.strftime('%d/%m/%Y %H:%M'))
        receipt.separator()
        
        # Items
        for item in items:
            qty = item.get('quantity', 1)
            name = item.get('menu_item_name', 'Article')
            unit_price = item.get('unit_price', 0)
            line_total = qty * unit_price
            
            receipt.item_row(qty, name, f"{int(line_total):,}".replace(',', ' '))
        
        # Totals
        receipt.separator()
        receipt.row("Sous-total:", f"{int(subtotal):,} {currency_symbol}".replace(',', ' '))
        receipt.separator('=')
        receipt.bold()
        receipt.content.extend(ESC.DOUBLE_HEIGHT_ON)
        receipt.row("TOTAL:", f"{int(total):,} {currency_symbol}".replace(',', ' '))
        receipt.content.extend(ESC.NORMAL_SIZE)
        receipt.separator('=')
        
        # Payment info
        if payment_method:
            receipt.row("Paiement:", payment_method)
            receipt.newline()
        
        # Footer
        receipt.center()
        receipt.newline()
        receipt.line("Merci de votre visite!")
        receipt.line("A bientot!")
        receipt.newline()
        receipt.line(now.strftime('%d/%m/%Y %H:%M:%S'))
        
        # Cut
        receipt.cut()
        
        return receipt.build()
    
    def create_daily_close_report(
        self,
        date: str,
        total_revenue: float,
        order_count: int,
        payment_breakdown: Dict[str, float],
        department_breakdown: Dict[str, float],
        currency_symbol: str = "FCFA",
        restaurant_name: str = "LUMIÈRE RESTAURANT",
        paper_width: int = 48
    ) -> bytes:
        """Create a daily close report"""
        receipt = ReceiptBuilder(paper_width=paper_width)
        
        now = datetime.now()
        
        # Header
        receipt.center()
        receipt.double_size_line(restaurant_name)
        receipt.bold_line("CLOTURE DE CAISSE")
        receipt.separator('=')
        
        # Date info
        receipt.left()
        receipt.bold_line(f"Date: {date}")
        receipt.line(f"Imprime le: {now.strftime('%d/%m/%Y %H:%M')}")
        receipt.separator()
        
        # Summary
        receipt.bold_line("RESUME")
        receipt.row("Nb. commandes:", str(order_count))
        receipt.separator()
        
        # Payment breakdown
        receipt.bold_line("PAR MODE DE PAIEMENT")
        for method, amount in payment_breakdown.items():
            method_name = {
                'cash': 'Especes',
                'mobile_money': 'Mobile Money',
                'card': 'Carte'
            }.get(method, method)
            receipt.row(f"  {method_name}:", f"{int(amount):,} {currency_symbol}".replace(',', ' '))
        receipt.separator()
        
        # Department breakdown
        if department_breakdown:
            receipt.bold_line("PAR DEPARTEMENT")
            for dept, amount in department_breakdown.items():
                dept_name = {'kitchen': 'Cuisine', 'bar': 'Bar'}.get(dept, dept)
                receipt.row(f"  {dept_name}:", f"{int(amount):,} {currency_symbol}".replace(',', ' '))
            receipt.separator()
        
        # Total
        receipt.double_separator()
        receipt.content.extend(ESC.DOUBLE_SIZE_ON)
        receipt.center()
        receipt.line(f"TOTAL: {int(total_revenue):,} {currency_symbol}".replace(',', ' '))
        receipt.content.extend(ESC.NORMAL_SIZE)
        receipt.double_separator()
        
        # Signature line
        receipt.newline(3)
        receipt.left()
        receipt.line("Signature: ________________________")
        receipt.newline(2)
        
        # Cut
        receipt.cut()
        
        return receipt.build()
    
    def create_invoice(
        self,
        invoice_number: str,
        order_number: int,
        table_number: int,
        server_name: str,
        cashier_name: str,
        items: List[Dict[str, Any]],
        subtotal: float,
        total: float,
        currency_symbol: str = "FC",
        payment_method: str = "cash",
        restaurant_name: str = "LUMIÈRE RESTAURANT",
        restaurant_address: str = "",
        restaurant_city: str = "",
        restaurant_phone: str = "",
        restaurant_email: str = "",
        tax_id: str = "",
        receipt_footer: str = "Merci de votre visite!",
        customer_name: str = "",
        paper_width: int = 48
    ) -> bytes:
        """Create a complete invoice/receipt for thermal printer"""
        receipt = ReceiptBuilder(paper_width=paper_width)
        
        now = datetime.now()
        
        # Header with restaurant info
        receipt.center()
        receipt.double_size_line(restaurant_name)
        if restaurant_address:
            receipt.line(restaurant_address)
        if restaurant_city:
            receipt.line(restaurant_city)
        if restaurant_phone:
            receipt.line(f"Tel: {restaurant_phone}")
        if restaurant_email:
            receipt.line(f"Email: {restaurant_email}")
        if tax_id:
            receipt.line(f"NIF/RCCM: {tax_id}")
        receipt.separator('=')
        
        # Invoice number prominently
        receipt.center()
        receipt.bold_line(f"FACTURE N° {invoice_number}")
        receipt.separator()
        
        # Order details
        receipt.left()
        receipt.row("Date:", now.strftime('%d/%m/%Y'))
        receipt.row("Heure:", now.strftime('%H:%M:%S'))
        receipt.row("Table:", str(table_number))
        receipt.row("Serveur:", server_name)
        receipt.row("Caissier:", cashier_name)
        if customer_name:
            receipt.row("Client:", customer_name)
        receipt.separator()
        
        # Items header
        receipt.bold_line("ARTICLES")
        receipt.separator('-')
        
        # Items
        for item in items:
            qty = item.get('quantity', 1)
            name = item.get('menu_item_name', 'Article')
            unit_price = item.get('unit_price', 0)
            line_total = qty * unit_price
            
            # Item name on one line
            receipt.line(f"{qty}x {name}")
            # Price on next line, right-aligned
            receipt.right()
            receipt.line(f"{int(unit_price):,} x {qty} = {int(line_total):,}".replace(',', ' '))
            receipt.left()
        
        # Totals section
        receipt.separator('=')
        receipt.row("Sous-total:", f"{int(subtotal):,} {currency_symbol}".replace(',', ' '))
        receipt.separator('-')
        
        # Grand total
        receipt.content.extend(ESC.DOUBLE_HEIGHT_ON)
        receipt.row("TOTAL:", f"{int(total):,} {currency_symbol}".replace(',', ' '))
        receipt.content.extend(ESC.NORMAL_SIZE)
        receipt.separator('=')
        
        # Payment info
        payment_labels = {
            'cash': 'Espèces',
            'card': 'Carte bancaire',
            'mobile_money': 'Mobile Money'
        }
        receipt.row("Mode de paiement:", payment_labels.get(payment_method, payment_method))
        receipt.row("Montant reçu:", f"{int(total):,} {currency_symbol}".replace(',', ' '))
        receipt.row("Rendu:", f"0 {currency_symbol}")
        
        # Footer
        receipt.separator()
        receipt.center()
        receipt.newline()
        receipt.line(receipt_footer)
        receipt.newline()
        receipt.line("Conservez ce ticket comme preuve d'achat")
        receipt.newline(2)
        receipt.line(now.strftime('%d/%m/%Y %H:%M:%S'))
        
        # Cut
        receipt.cut()
        
        return receipt.build()


# Singleton instance
printer_service = PrinterService()


# Test function
async def test_printer(ip_address: str, port: int = 9100):
    """Test printing to a network printer"""
    config = PrinterConfig(
        name="Test Printer",
        ip_address=ip_address,
        port=port
    )
    
    service = PrinterService()
    service.add_printer("test", config)
    
    # Create a test ticket
    ticket = service.create_kitchen_ticket(
        order_number=999,
        table_number=1,
        server_name="Test",
        items=[
            {"quantity": 2, "menu_item_name": "Steak Frites", "notes": "Bien cuit"},
            {"quantity": 1, "menu_item_name": "Salade Cesar"},
        ],
        notes="Test d'impression"
    )
    
    result = await service.print_raw("test", ticket)
    return result


if __name__ == "__main__":
    # For testing
    import sys
    if len(sys.argv) > 1:
        ip = sys.argv[1]
        port = int(sys.argv[2]) if len(sys.argv) > 2 else 9100
        result = asyncio.run(test_printer(ip, port))
        print(result)
    else:
        print("Usage: python printer_service.py <ip_address> [port]")
