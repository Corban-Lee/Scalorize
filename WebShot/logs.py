import logging
import os
import datetime

def setup_logging():
    # Create a new log file for each session
    session_id = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = f"session_{session_id}.log"

    # Create a logging directory if it doesn't exist
    log_dir = "logs"
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)

    # Set up the logging configuration
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.FileHandler(os.path.join(log_dir, log_file)),
            logging.StreamHandler()
        ]
    )

if __name__ == "__main__":
        
    # Call the setup_logging function to set up logging
    setup_logging()

    # Use log = logging.getLogger(__name__) in any Python file after setup
    log = logging.getLogger(__name__)

    # Example usage
    log.debug("Debug message")
    log.info("Info message")
    log.warning("Warning message")
    log.error("Error message")
